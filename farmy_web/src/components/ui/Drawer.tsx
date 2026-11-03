"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = { open: boolean; title: string; onClose: () => void; children: ReactNode };

/**
 * Side sheet for less frequent tools (add batch, admin). Esc, the backdrop and the close button close it.
 * Not a modal <dialog>: that would sit above the toasts, which must stay visible after each transaction.
 */
export function Drawer({ open, title, onClose, children }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);

  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-card text-ink shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="h-10 rounded-xl px-3 text-sm font-semibold hover:bg-field-wash">
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
