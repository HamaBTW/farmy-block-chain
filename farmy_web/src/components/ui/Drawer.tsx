"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = { open: boolean; title: string; onClose: () => void; children: ReactNode };

/** Side sheet for less frequent tools (add batch, admin). Esc and the close button close it. */
export function Drawer({ open, title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-0 ml-auto h-full max-h-none w-full max-w-lg bg-card p-0 text-ink backdrop:bg-black/40"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="h-10 rounded-xl px-3 text-sm font-semibold hover:bg-field-wash">
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </dialog>
  );
}
