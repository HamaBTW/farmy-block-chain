import { Contract, JsonRpcProvider, type ContractRunner, type InterfaceAbi } from "ethers";
import deployments from "@/contracts/deployments.json";
import { GANACHE } from "./chain";

/** Contracts the UI knows about. Names must match the Solidity contract names. */
export type ContractName = "BatchRegistry" | "FarmCoin" | "PriceCapEscrow";

type Deployment = { address: string; abi: InterfaceAbi };

const all = deployments as Record<string, Deployment>;

export function getDeployment(name: ContractName): Deployment | null {
  return all[name] ?? null;
}

/**
 * Returns an ethers Contract for a deployed Truffle contract, or null if it is not
 * deployed on Ganache yet. Pass a signer to send transactions, omit it to read only.
 */
export function getContract(name: ContractName, runner?: ContractRunner): Contract | null {
  const deployment = getDeployment(name);
  if (!deployment) return null;
  return new Contract(deployment.address, deployment.abi, runner ?? getReadProvider());
}

let readProvider: JsonRpcProvider | null = null;

/** Read-only provider straight to Ganache, so views work before a wallet connects. */
export function getReadProvider(): JsonRpcProvider {
  readProvider ??= new JsonRpcProvider(GANACHE.rpcUrl, GANACHE.chainId, { staticNetwork: true });
  return readProvider;
}
