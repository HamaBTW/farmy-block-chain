import { canonicalJson, hashDoc, parseDoc, type FarmyDoc } from "./metadata";

const KEY = "farmy.docs.v1";

/** Off-chain copies of batch and checkpoint JSON, kept in this browser and looked up by hash. */
function readAll(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

/** Saves the JSON and returns its hash. */
export function saveDoc(doc: FarmyDoc): string {
  const hash = hashDoc(doc);
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [hash]: canonicalJson(doc) }));
  } catch {
    // Storage blocked: the details can still be downloaded and verified later.
  }
  return hash;
}

export function getDoc(hash: string): FarmyDoc | null {
  const text = readAll()[hash.toLowerCase()];
  return text ? parseDoc(text) : null;
}

export function downloadDoc(doc: FarmyDoc, fileName: string): void {
  const url = URL.createObjectURL(new Blob([canonicalJson(doc)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
