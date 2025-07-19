import { AptosClient, AptosAccount, TxnBuilderTypes, BCS, Provider } from "@aptos-labs/ts-sdk";
import { 
  WalletCore, 
  NetworkInfo, 
  WalletInfo, 
  WalletReadyState,
  WalletAdapter 
} from "@aptos-labs/wallet-adapter-base";

// Aptos network configurations
export const APTOS_NETWORKS = {
  mainnet: {
    name: "Aptos Mainnet",
    chainId: 1,
    url: "https://fullnode.mainnet.aptoslabs.com",
    faucetUrl: null
  },
  testnet: {
    name: "Aptos Testnet", 
    chainId: 2,
    url: "https://fullnode.testnet.aptoslabs.com",
    faucetUrl: "https://faucet.testnet.aptoslabs.com"
  },
  devnet: {
    name: "Aptos Devnet",
    chainId: 0,
    url: "https://fullnode.devnet.aptoslabs.com", 
    faucetUrl: "https://faucet.devnet.aptoslabs.com"
  }
};

// Default network (can be changed via environment variable)
export const DEFAULT_NETWORK = process.env.NEXT_PUBLIC_APTOS_NETWORK || 'testnet';

// Aptos client instance
export const aptosClient = new AptosClient(APTOS_NETWORKS[DEFAULT_NETWORK].url);

// Module addresses for our casino contracts
export const CASINO_MODULE_ADDRESS = process.env.NEXT_PUBLIC_CASINO_MODULE_ADDRESS || 
  "0x1234567890123456789012345678901234567890123456789012345678901234";

// Token module address (APT token)
export const APT_TOKEN_MODULE = "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>";

// Casino game module names
export const CASINO_MODULES = {
  roulette: `${CASINO_MODULE_ADDRESS}::roulette`,
  mines: `${CASINO_MODULE_ADDRESS}::mines`, 
  wheel: `${CASINO_MODULE_ADDRESS}::wheel`
};

// Helper function to get account balance
export async function getAccountBalance(address) {
  try {
    const resources = await aptosClient.getAccountResources({ accountAddress: address });
    const aptCoinResource = resources.find(r => r.type === APT_TOKEN_MODULE);
    
    if (aptCoinResource) {
      return aptCoinResource.data.coin.value;
    }
    return "0";
  } catch (error) {
    console.error("Error getting account balance:", error);
    return "0";
  }
}

// Helper function to format APT amount
export function formatAptAmount(amount) {
  return (parseInt(amount) / 100000000).toFixed(8);
}

// Helper function to parse APT amount
export function parseAptAmount(amount) {
  return Math.floor(parseFloat(amount) * 100000000).toString();
}

// Helper function to check if wallet is connected
export function isWalletConnected(wallet) {
  return wallet && wallet.connected;
}

// Helper function to get connected account
export function getConnectedAccount(wallet) {
  if (!isWalletConnected(wallet)) {
    return null;
  }
  return wallet.account;
}

// Helper function to sign and submit transaction
export async function signAndSubmitTransaction(wallet, payload) {
  if (!isWalletConnected(wallet)) {
    throw new Error("Wallet not connected");
  }

  try {
    const response = await wallet.signAndSubmitTransaction(payload);
    return response;
  } catch (error) {
    console.error("Transaction failed:", error);
    throw error;
  }
}

// Helper function to wait for transaction
export async function waitForTransaction(hash) {
  try {
    const transaction = await aptosClient.waitForTransaction({ transactionHash: hash });
    return transaction;
  } catch (error) {
    console.error("Error waiting for transaction:", error);
    throw error;
  }
}

// Helper function to create entry function payload
export function createEntryFunctionPayload(
  moduleAddress,
  moduleName,
  functionName,
  typeArgs = [],
  args = []
) {
  return {
    function: `${moduleAddress}::${moduleName}::${functionName}`,
    type_arguments: typeArgs,
    arguments: args
  };
}

// Helper function to create coin transfer payload
export function createCoinTransferPayload(to, amount) {
  return {
    function: "0x1::coin::transfer",
    type_arguments: ["0x1::aptos_coin::AptosCoin"],
    arguments: [to, amount]
  };
}

// Helper function to get random number from blockchain
export async function getRandomNumber(seed) {
  // This would typically call a randomness oracle or VRF
  // For now, we'll use a simple hash-based approach
  const timestamp = Date.now();
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  
  return {
    randomNumber: Array.from(randomBytes).reduce((acc, byte) => acc + byte, 0),
    timestamp
  };
}

// Casino game helper functions
export const CasinoGames = {
  // Roulette game functions
  roulette: {
    placeBet: (betType, betValue, amount, numbers = []) => {
      return createEntryFunctionPayload(
        CASINO_MODULE_ADDRESS,
        "roulette",
        "place_bet",
        [],
        [betType, betValue, amount, numbers]
      );
    },
    
    getGameState: async () => {
      try {
        const resource = await aptosClient.getAccountResource({
          accountAddress: CASINO_MODULE_ADDRESS,
          resourceType: `${CASINO_MODULE_ADDRESS}::roulette::GameState`
        });
        return resource.data;
      } catch (error) {
        console.error("Error getting roulette game state:", error);
        return null;
      }
    }
  },

  // Mines game functions  
  mines: {
    startGame: (betAmount, minesCount, tilesToReveal) => {
      return createEntryFunctionPayload(
        CASINO_MODULE_ADDRESS,
        "mines", 
        "start_game",
        [],
        [betAmount, minesCount, tilesToReveal]
      );
    },

    revealTile: (tileIndex) => {
      return createEntryFunctionPayload(
        CASINO_MODULE_ADDRESS,
        "mines",
        "reveal_tile", 
        [],
        [tileIndex]
      );
    },

    cashout: () => {
      return createEntryFunctionPayload(
        CASINO_MODULE_ADDRESS,
        "mines",
        "cashout",
        [],
        []
      );
    },

    getGameState: async () => {
      try {
        const resource = await aptosClient.getAccountResource({
          accountAddress: CASINO_MODULE_ADDRESS,
          resourceType: `${CASINO_MODULE_ADDRESS}::mines::GameState`
        });
        return resource.data;
      } catch (error) {
        console.error("Error getting mines game state:", error);
        return null;
      }
    }
  },

  // Wheel game functions
  wheel: {
    spin: (betAmount, riskLevel) => {
      return createEntryFunctionPayload(
        CASINO_MODULE_ADDRESS,
        "wheel",
        "spin",
        [],
        [betAmount, riskLevel]
      );
    },

    getGameState: async () => {
      try {
        const resource = await aptosClient.getAccountResource({
          accountAddress: CASINO_MODULE_ADDRESS,
          resourceType: `${CASINO_MODULE_ADDRESS}::wheel::GameState`
        });
        return resource.data;
      } catch (error) {
        console.error("Error getting wheel game state:", error);
        return null;
      }
    }
  }
};

// Export default configuration
export default {
  aptosClient,
  APTOS_NETWORKS,
  DEFAULT_NETWORK,
  CASINO_MODULE_ADDRESS,
  CASINO_MODULES,
  CasinoGames
}; 