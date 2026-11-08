import { formatFrm } from "./format.ts";

export type DecodedError = { name: string; args: readonly unknown[] };

const frm = (v: unknown) => formatFrm(v as bigint);
const STATES = ["None", "created", "paid into escrow", "released", "refunded"];

/** Every custom error of BatchRegistry, FarmCoin and PriceCapEscrow (and their OpenZeppelin bases), in plain words. */
const MESSAGES: Record<string, (args: readonly unknown[]) => string> = {
  PriceAboveCap: (a) => `This price is above the cap of ${frm(a[1])}. Lower it or ask the market authority to raise the markup.`,
  ZeroPrice: () => "Enter a price above 0.",
  ZeroAddress: () => "Pick a person or enter a valid address.",
  NotCustodian: () => "Only the person holding it can do that.",
  BatchAlreadyListed: (a) => `This asset is already listed (sale #${a[0]}). Cancel that listing first.`,
  WrongState: (a) => (Number(a[0]) === 0 ? "This sale doesn't exist." : `This sale is already ${STATES[Number(a[0])]}.`),
  SellerCannotBuy: () => "You can't buy your own listing.",
  NotValidated: () => "It isn't validated yet. An inspector has to check and validate it first.",
  CustodyNotMoved: () => "The goods haven't been handed to the buyer yet.",
  NotAllowed: () => "Only the seller or the buyer can do that right now.",
  ReleaseConditionsMet: () => "The goods are validated and delivered, so the payment can only be released now.",
  NotInspector: () => "Only an inspector can do that. Ask the regulator to make you an inspector.",
  AlreadyValidated: () => "This asset is already validated.",
  NotEscrow: () => "Only the escrow contract can record sale prices.",
  OwnableUnauthorizedAccount: () => "Only the regulator / market authority can do that.",
  ERC20InsufficientAllowance: () => "The escrow isn't allowed to take your FRM yet. Approve the payment first.",
  ERC20InsufficientBalance: (a) => `You have ${frm(a[1])} but need ${frm(a[2])}. Buy more FRM with ETH on the Market.`,
  ERC20InvalidReceiver: () => "Pick who receives the FRM.",
  ERC721IncorrectOwner: () => "Only the person holding it can hand it over.",
  ERC721NonexistentToken: (a) => `Asset #${a[0]} doesn't exist.`,
  ERC721InvalidReceiver: () => "Pick who receives the asset.",
  UnknownBatch: (a) => `Asset #${a[0]} doesn't exist.`,
  WrongKind: () => "That doesn't work for this kind of asset.",
  ZeroQuantity: () => "Enter a quantity above 0.",
  BadSplit: () => "Split into 2 to 10 parts that add up to the lot's quantity.",
  LotClosed: () => "This lot was split. Use its smaller lots instead.",
  NotActive: () => "This lot was split, so it can't be listed. List one of its smaller lots.",
  ZeroAmount: () => "Enter an amount above 0.",
  ERC20ExceededCap: (a) => `That would pass FarmCoin's max supply of ${frm(a[1])}.`,
  EthTransferFailed: () => "The ETH couldn't be sent back to you.",
};

export function friendlyError({ name, args }: DecodedError): string {
  const message = MESSAGES[name];
  return message ? message(args) : `Reverted: ${name}(${args.map(String).join(", ")})`;
}

const E18 = BigInt(10) ** BigInt(18);
const SAMPLE_ARGS: Record<string, unknown[]> = {
  PriceAboveCap: [BigInt(150) * E18, BigInt(120) * E18],
  BatchAlreadyListed: [BigInt(1)],
  WrongState: [BigInt(3)],
  ERC20InsufficientBalance: ["0x0", BigInt(10) * E18, BigInt(115) * E18],
  ERC20ExceededCap: [BigInt(1000001) * E18, BigInt(1000000) * E18],
  ERC721NonexistentToken: [BigInt(7)],
  UnknownBatch: [BigInt(7)],
};

/** One line per error, with example values, for the guide. */
export const ERROR_HELP = Object.keys(MESSAGES).map((name) => ({ name, meaning: friendlyError({ name, args: SAMPLE_ARGS[name] ?? [] }) }));
