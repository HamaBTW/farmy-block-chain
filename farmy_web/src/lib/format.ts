import { formatUnits } from "ethers";

/** FRM amount for people: "120 FRM", "115.5 FRM" (18 decimals, no trailing ".0"). */
export function formatFrm(value: bigint | string): string {
  return `${formatUnits(value, 18).replace(/\.0$/, "")} FRM`;
}
