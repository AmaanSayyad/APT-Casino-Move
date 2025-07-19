const { AptosClient, AptosAccount, TxnBuilderTypes, BCS } = require("@aptos-labs/ts-sdk");
const fs = require("fs");
const path = require("path");

// Network configurations
const NETWORKS = {
  testnet: {
    name: "Aptos Testnet",
    url: "https://fullnode.testnet.aptoslabs.com",
    faucetUrl: "https://faucet.testnet.aptoslabs.com"
  },
  mainnet: {
    name: "Aptos Mainnet", 
    url: "https://fullnode.mainnet.aptoslabs.com",
    faucetUrl: null
  }
};

// Deployer account configuration
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const MODULE_ADDRESS = process.env.MODULE_ADDRESS || "0x1234567890123456789012345678901234567890123456789012345678901234";

class CasinoDeployer {
  constructor(network = "testnet") {
    this.network = network;
    this.client = new AptosClient(NETWORKS[network].url);
    this.deployer = new AptosAccount(DEPLOYER_PRIVATE_KEY);
  }

  async initialize() {
    console.log(`Initializing deployment to ${NETWORKS[this.network].name}...`);
    
    // Check if deployer account exists
    const accountExists = await this.client.accountExists({ accountAddress: this.deployer.accountAddress });
    
    if (!accountExists) {
      console.log("Deployer account doesn't exist. Creating account...");
      await this.createAccount();
    }
    
    // Fund account if on testnet
    if (this.network === "testnet") {
      await this.fundAccount();
    }
    
    console.log(`Deployer account: ${this.deployer.accountAddress}`);
  }

  async createAccount() {
    const payload = {
      function: "0x1::aptos_account::create_account",
      type_arguments: [],
      arguments: [this.deployer.accountAddress]
    };
    
    const rawTxn = await this.client.generateTransaction(this.deployer.accountAddress, payload);
    const bcsTxn = AptosClient.generateBCSTransaction(this.deployer, rawTxn);
    const transactionRes = await this.client.submitTransaction(bcsTxn);
    await this.client.waitForTransaction({ transactionHash: transactionRes.hash });
  }

  async fundAccount() {
    console.log("Funding deployer account...");
    
    const response = await fetch(NETWORKS[this.network].faucetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address: this.deployer.accountAddress,
        amount: 1000000000, // 10 APT
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fund account: ${response.statusText}`);
    }
    
    console.log("Account funded successfully");
  }

  async deployModule(moduleName) {
    console.log(`Deploying ${moduleName} module...`);
    
    // Read the compiled module
    const modulePath = path.join(__dirname, "..", "build", "apt_casino", "bytecode_modules", `${moduleName}.mv`);
    const moduleBytes = fs.readFileSync(modulePath);
    
    const payload = {
      function: "0x1::code::publish_package_txn",
      type_arguments: [],
      arguments: [
        [moduleBytes.toString("hex")],
        [],
        []
      ]
    };
    
    const rawTxn = await this.client.generateTransaction(this.deployer.accountAddress, payload);
    const bcsTxn = AptosClient.generateBCSTransaction(this.deployer, rawTxn);
    const transactionRes = await this.client.submitTransaction(bcsTxn);
    
    console.log(`Transaction submitted: ${transactionRes.hash}`);
    await this.client.waitForTransaction({ transactionHash: transactionRes.hash });
    
    console.log(`${moduleName} module deployed successfully`);
    return transactionRes.hash;
  }

  async initializeModule(moduleName) {
    console.log(`Initializing ${moduleName} module...`);
    
    const payload = {
      function: `${MODULE_ADDRESS}::${moduleName}::init_module`,
      type_arguments: [],
      arguments: []
    };
    
    const rawTxn = await this.client.generateTransaction(this.deployer.accountAddress, payload);
    const bcsTxn = AptosClient.generateBCSTransaction(this.deployer, rawTxn);
    const transactionRes = await this.client.submitTransaction(bcsTxn);
    
    console.log(`Initialization transaction submitted: ${transactionRes.hash}`);
    await this.client.waitForTransaction({ transactionHash: transactionRes.hash });
    
    console.log(`${moduleName} module initialized successfully`);
    return transactionRes.hash;
  }

  async deployAll() {
    try {
      await this.initialize();
      
      // Deploy all modules
      const modules = ["roulette", "mines", "wheel"];
      
      for (const module of modules) {
        await this.deployModule(module);
        await this.initializeModule(module);
      }
      
      console.log("All casino modules deployed successfully!");
      console.log(`Module address: ${MODULE_ADDRESS}`);
      console.log(`Network: ${NETWORKS[this.network].name}`);
      
    } catch (error) {
      console.error("Deployment failed:", error);
      throw error;
    }
  }

  async verifyDeployment() {
    console.log("Verifying deployment...");
    
    try {
      // Check if modules exist
      const modules = ["roulette", "mines", "wheel"];
      
      for (const module of modules) {
        const resource = await this.client.getAccountResource({
          accountAddress: MODULE_ADDRESS,
          resourceType: `${MODULE_ADDRESS}::${module}::GameState`
        });
        
        console.log(`${module} module verified successfully`);
      }
      
      console.log("All modules verified successfully!");
      
    } catch (error) {
      console.error("Verification failed:", error);
      throw error;
    }
  }
}

// Main deployment function
async function main() {
  const network = process.argv[2] || "testnet";
  
  if (!DEPLOYER_PRIVATE_KEY) {
    console.error("DEPLOYER_PRIVATE_KEY environment variable is required");
    process.exit(1);
  }
  
  if (!["testnet", "mainnet"].includes(network)) {
    console.error("Invalid network. Use 'testnet' or 'mainnet'");
    process.exit(1);
  }
  
  const deployer = new CasinoDeployer(network);
  
  try {
    await deployer.deployAll();
    await deployer.verifyDeployment();
    
    console.log("\n🎉 Deployment completed successfully!");
    console.log(`📋 Network: ${NETWORKS[network].name}`);
    console.log(`🏗️  Module Address: ${MODULE_ADDRESS}`);
    console.log(`👤 Deployer: ${deployer.deployer.accountAddress}`);
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

// Run deployment if called directly
if (require.main === module) {
  main();
}

module.exports = { CasinoDeployer, NETWORKS }; 