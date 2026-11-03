"use client";

import { useContractTx, type Signed } from "@/lib/tx";
import { Button, type ButtonVariant } from "./Button";
import { useToast } from "./Toast";

type Props = {
  /** Verb + object, e.g. "List for sale". */
  label: string;
  /** Past tense shown in the toast, e.g. "Listed for sale". */
  done: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  className?: string;
  send: (signed: Signed) => Promise<unknown>;
  onDone?: () => void;
};

/** A button that sends one or more transactions, then confirms with a toast or explains the revert. */
export function TxButton({ label, done, variant = "secondary", disabled, className, send, onDone }: Props) {
  const { run, pending, error, pendingLabel } = useContractTx();
  const { show } = useToast();

  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Button
        variant={variant}
        disabled={disabled || pending}
        className="w-full sm:w-auto"
        onClick={async () => {
          const ok = await run(async (signed) => {
            await send(signed);
          });
          if (ok) {
            show(done);
            onDone?.();
          }
        }}
      >
        {pending ? pendingLabel : label}
      </Button>
      {error && <p className="text-sm text-beet">{error}</p>}
    </div>
  );
}
