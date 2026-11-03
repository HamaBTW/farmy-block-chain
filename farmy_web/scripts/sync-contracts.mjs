// Copies ABI + Ganache address of every deployed contract from the Truffle build
// into src/contracts/deployments.json. Run after every `truffle migrate`.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const NETWORK_ID = process.env.NEXT_PUBLIC_NETWORK_ID ?? "5777";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const buildDir = join(root, "..", "farmy_blockchain", "build", "contracts");
const outFile = join(root, "src", "contracts", "deployments.json");

const deployments = {};

if (existsSync(buildDir)) {
  for (const file of readdirSync(buildDir).filter((f) => f.endsWith(".json"))) {
    const artifact = JSON.parse(readFileSync(join(buildDir, file), "utf8"));
    const address = artifact.networks?.[NETWORK_ID]?.address;
    if (address) deployments[artifact.contractName] = { address, abi: artifact.abi };
  }
} else {
  console.warn(`[sync-contracts] ${buildDir} not found. Run \`truffle migrate\` first.`);
}

writeFileSync(outFile, JSON.stringify(deployments, null, 2) + "\n");
const names = Object.keys(deployments);
console.log(`[sync-contracts] network ${NETWORK_ID}: ${names.length ? names.join(", ") : "no deployed contracts"}`);
