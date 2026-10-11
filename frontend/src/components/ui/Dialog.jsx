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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/60 p-2 sm:p-4 backdrop-blur-xs" role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog" aria-modal="true" aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`my-auto flex max-h-[88vh] w-full flex-col rounded-2xl bg-surface border border-border shadow-2xl ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}
      >
        <div className="shrink-0 flex items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5 sm:py-4 bg-surface rounded-t-2xl">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="shrink-0 rounded-lg p-1.5 text-muted hover:text-ink hover:bg-canvas transition">
            <X className="size-5" />
          </button>
        </div>
        <div className="scroll-region min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
