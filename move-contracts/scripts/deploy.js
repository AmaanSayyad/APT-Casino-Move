import { Aptos, AptosConfig, NetworkToNetworkName, Account } from "@aptos-labs/ts-sdk";
import path from "path";
import fs from "fs";

async function main() {
  const privateKeyHex = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKeyHex) {
    console.error("Set DEPLOYER_PRIVATE_KEY in environment");
    process.exit(1);
  }

  const config = new AptosConfig({ network: NetworkToNetworkName.TESTNET });
  const aptos = new Aptos(config);

  const deployer = Account.fromPrivateKey({ privateKeyHex: privateKeyHex });

  const packageDir = path.resolve(process.cwd());

  const tx = await aptos.publishPackage({
    account: deployer,
    packageDirectoryPath: packageDir,
  });

  console.log("Publish tx:", tx);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}); 