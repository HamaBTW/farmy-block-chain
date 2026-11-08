import { keccak256, toUtf8Bytes } from "ethers";

/** Batch description. Only its hash goes on-chain (as the token URI); the JSON stays off-chain. */
export type BatchDoc = { schema: "farmy.batch.v1"; product: string; origin: string; quantity: string; unit: string; harvestDate: string };
/** Inspection record. Its hash is the bytes32 `dataHash` of `addCheckpoint`. */
export type CheckpointDoc = {
  schema: "farmy.checkpoint.v1";
  batchId: string;
  weightKg: string;
  temperatureC: string;
  location: string;
  note: string;
  time: string;
};
/** Land parcel description (registered by the regulator). */
export type LandDoc = { schema: "farmy.land.v1"; name: string; location: string; areaHa: string };
/** Machine description (registered by the regulator). */
export type MachineDoc = { schema: "farmy.machine.v1"; name: string; model: string; year: string };
/** Anything whose hash can be a token URI. */
export type AssetDoc = BatchDoc | LandDoc | MachineDoc;
export type FarmyDoc = AssetDoc | CheckpointDoc;

const KEYS: Record<FarmyDoc["schema"], string[]> = {
  "farmy.land.v1": ["schema", "name", "location", "areaHa"],
  "farmy.machine.v1": ["schema", "name", "model", "year"],
  "farmy.batch.v1": ["schema", "product", "origin", "quantity", "unit", "harvestDate"],
  "farmy.checkpoint.v1": ["schema", "batchId", "weightKg", "temperatureC", "location", "note", "time"],
};

export const PRODUCTS = [
  { name: "Tomatoes", emoji: "🍅", unit: "kg" },
  { name: "Grain", emoji: "🌾", unit: "t" },
  { name: "Cattle", emoji: "🐄", unit: "heads" },
  { name: "Olives", emoji: "🫒", unit: "kg" },
  { name: "Citrus", emoji: "🍊", unit: "crates" },
];
export const UNITS = ["kg", "t", "crates", "heads"];
export const ORIGINS = ["Sfax", "Nabeul", "Béja", "Kairouan", "Sousse"];

const URI_PREFIX = "farmy:keccak256:";

/** JSON with the schema's key order, so the same data always gives the same hash. */
export function canonicalJson(doc: FarmyDoc): string {
  return JSON.stringify(doc, KEYS[doc.schema]);
}

export function hashDoc(doc: FarmyDoc): string {
  return keccak256(toUtf8Bytes(canonicalJson(doc)));
}

export function batchUri(doc: AssetDoc): string {
  return URI_PREFIX + hashDoc(doc);
}

/** The hash inside a `farmy:keccak256:0x…` URI, or null for any other URI. */
export function hashFromUri(uri: string): string | null {
  const hash = uri.startsWith(URI_PREFIX) ? uri.slice(URI_PREFIX.length) : "";
  return /^0x[0-9a-f]{64}$/.test(hash) ? hash : null;
}

/** Reads a downloaded Farmy JSON back; null if it isn't one of our schemas. */
export function parseDoc(text: string): FarmyDoc | null {
  try {
    const value = JSON.parse(text) as Record<string, unknown>;
    const keys = KEYS[value?.schema as FarmyDoc["schema"]];
    if (!keys || !keys.every((k) => typeof value[k] === "string")) return null;
    return JSON.parse(canonicalJson(value as FarmyDoc)) as FarmyDoc;
  } catch {
    return null;
  }
}

export function productEmoji(product: string): string {
  return PRODUCTS.find((p) => p.name.toLowerCase() === product.toLowerCase())?.emoji ?? "📦";
}
