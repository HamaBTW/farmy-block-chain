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
/** Inspection of a land parcel: measured area and soil. Its hash is the `dataHash` of the check. */
export type LandCheckDoc = { schema: "farmy.landcheck.v1"; batchId: string; areaHa: string; soil: string; location: string; note: string; time: string };
/** Inspection of a machine: condition and hours used. */
export type MachineCheckDoc = { schema: "farmy.machinecheck.v1"; batchId: string; condition: string; hours: string; location: string; note: string; time: string };
/** Any inspector record: lots use CheckpointDoc (weight, temperature). */
export type CheckDoc = CheckpointDoc | LandCheckDoc | MachineCheckDoc;
/** Anything whose hash can be a token URI. */
export type AssetDoc = BatchDoc | LandDoc | MachineDoc;
export type FarmyDoc = AssetDoc | CheckDoc;

const KEYS: Record<FarmyDoc["schema"], string[]> = {
  "farmy.land.v1": ["schema", "name", "location", "areaHa"],
  "farmy.machine.v1": ["schema", "name", "model", "year"],
  "farmy.batch.v1": ["schema", "product", "origin", "quantity", "unit", "harvestDate"],
  "farmy.checkpoint.v1": ["schema", "batchId", "weightKg", "temperatureC", "location", "note", "time"],
  "farmy.landcheck.v1": ["schema", "batchId", "areaHa", "soil", "location", "note", "time"],
  "farmy.machinecheck.v1": ["schema", "batchId", "condition", "hours", "location", "note", "time"],
};

const ASSET_SCHEMAS: AssetDoc["schema"][] = ["farmy.land.v1", "farmy.machine.v1", "farmy.batch.v1"];

/** True for land, machine and lot details; false for inspector records. */
export function isAssetDoc(doc: FarmyDoc): doc is AssetDoc {
  return (ASSET_SCHEMAS as string[]).includes(doc.schema);
}

export const SOIL_STATES = ["Good", "Fair", "Poor"];
export const MACHINE_STATES = ["Working", "Needs repair", "Out of service"];

/** One line for a check stamp in the journey. */
export function checkDetail(doc: CheckDoc): string {
  const parts =
    doc.schema === "farmy.landcheck.v1"
      ? [`${doc.areaHa} ha measured`, `soil ${doc.soil.toLowerCase()}`]
      : doc.schema === "farmy.machinecheck.v1"
        ? [doc.condition.toLowerCase(), `${doc.hours} h used`]
        : [`${doc.weightKg} kg`, `${doc.temperatureC} °C`];
  return [...parts, doc.location, doc.note].filter(Boolean).join(" · ");
}

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
