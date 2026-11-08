/** Same limit as BatchRegistry.MAX_PARTS. */
export const MAX_PARTS = 10;

/** Mirrors BatchRegistry.splitLot: price × part / total, the last part takes the rounding remainder. */
export function splitPrices(price: bigint, parts: bigint[]): bigint[] {
  const total = parts.reduce((a, q) => a + q, BigInt(0));
  let left = price;
  return parts.map((q, i) => {
    const p = i === parts.length - 1 ? left : (price * q) / total;
    left -= p;
    return p;
  });
}

/** The reason a split would be refused (BadSplit), in plain words, or null when it is fine. */
export function checkSplit(quantity: bigint, parts: bigint[]): string | null {
  if (parts.length < 2) return "Split into at least 2 parts.";
  if (parts.length > MAX_PARTS) return `Split into at most ${MAX_PARTS} parts.`;
  if (parts.some((q) => q <= BigInt(0))) return "Every part needs a quantity above 0.";
  const sum = parts.reduce((a, q) => a + q, BigInt(0));
  return sum === quantity ? null : `The parts add up to ${sum}, but the lot has ${quantity}.`;
}
