export type OpenSale = { id: bigint; seller: string; buyer: string; price: bigint; state: "Created" | "Deposited" };
export type JourneyState = { batchId: bigint; custodian: string; validated: boolean; lastPrice: bigint; sale: OpenSale | null };
export type Who = { kind: "address"; address: string } | { kind: "inspector" } | { kind: "anyone" } | { kind: "notSeller"; seller: string };
export type StepAction =
  | "addCheckpoint"
  | "validate"
  | "handOver"
  | "listForSale"
  | "cancelListing"
  | "buy"
  | "clearListing"
  | "handToBuyer"
  | "release"
  | "refundBuyer"
  | "refundMe";
export type Step = { action: StepAction; who: Who; primary: boolean };

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const by = (address: string): Who => ({ kind: "address", address });
const step = (action: StepAction, who: Who, primary = false): Step => ({ action, who, primary });

/**
 * What can happen next to a batch, mirroring the contracts' rules so the UI offers the right button.
 * The contracts still enforce every rule; this only decides what to show.
 */
export function nextSteps(s: JourneyState): Step[] {
  const inspect = (primary: boolean) => [step("validate", { kind: "inspector" }, primary), step("addCheckpoint", { kind: "inspector" })];
  const { sale } = s;

  if (!sale) {
    return s.validated
      ? [step("listForSale", by(s.custodian), true), step("handOver", by(s.custodian))]
      : [...inspect(true), step("handOver", by(s.custodian))];
  }

  if (sale.state === "Created") {
    if (!same(s.custodian, sale.seller)) return [step("clearListing", { kind: "anyone" }, true)];
    return [step("buy", { kind: "notSeller", seller: sale.seller }, true), step("cancelListing", by(sale.seller))];
  }

  const [refundBuyer, refundMe] = [step("refundBuyer", by(sale.seller)), step("refundMe", by(sale.buyer))];
  // Delivered and validated: the buyer can no longer take the money back (ReleaseConditionsMet).
  if (s.validated && same(s.custodian, sale.buyer)) return [step("release", { kind: "anyone" }, true), refundBuyer];
  // Hand the goods over only after validation, otherwise the buyer could refund and keep them.
  if (!s.validated) return [...inspect(true), refundBuyer, refundMe];
  if (same(s.custodian, sale.seller)) return [step("handToBuyer", by(sale.seller), true), refundBuyer, refundMe];
  return [{ ...refundMe, primary: true }, refundBuyer];
}

export function canDo(st: Step, me: string | null, isInspector: boolean): boolean {
  if (!me) return false;
  switch (st.who.kind) {
    case "address":
      return same(st.who.address, me);
    case "inspector":
      return isInspector;
    case "anyone":
      return true;
    case "notSeller":
      return !same(st.who.seller, me);
  }
}

export function primaryStep(steps: Step[]): Step | undefined {
  return steps.find((s) => s.primary);
}

/** Steps handled by the registry screens (A); every other step is a market step (B). */
export const REGISTRY_ACTIONS: StepAction[] = ["validate", "addCheckpoint", "handOver"];

/** "Waiting for <who> to <phrase>." */
export const STEP_PHRASES: Record<StepAction, string> = {
  addCheckpoint: "add a checkpoint",
  validate: "validate this batch",
  handOver: "hand it over",
  listForSale: "list it for sale",
  cancelListing: "cancel the listing",
  buy: "buy it",
  clearListing: "clear the old listing",
  handToBuyer: "hand the goods to the buyer",
  release: "release the payment",
  refundBuyer: "refund the buyer",
  refundMe: "take the money back",
};
