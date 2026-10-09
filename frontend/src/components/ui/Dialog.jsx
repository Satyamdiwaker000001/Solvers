import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useContainedFocus } from "../../hooks/useContainedFocus.js";

/**
 * Accessible dialog (UI spec §6, §10): labelled, focus-trapped, Escape to
 * close, focus restored to the trigger, viewport-aware, internal scroll.
 */
export function Dialog({ title, description, onClose, children, wide }) {
  const panelRef = useRef(null);
  useContainedFocus(panelRef, { onEscape: onClose });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-0 sm:items-center sm:p-6" role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog" aria-modal="true" aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[92svh] w-full flex-col rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}
      >
        <div className="flex items-start justify-between gap-2 border-b border-border p-3.5 sm:p-5">
          <div className="min-w-0">
            <h2 className="text-base font-bold">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="shrink-0 rounded-lg p-2 text-muted hover:bg-canvas">
            <X className="size-5" />
          </button>
        </div>
        <div className="scroll-region min-h-0 overflow-y-auto p-3.5 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
