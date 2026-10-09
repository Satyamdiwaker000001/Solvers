import { useEffect, useRef } from "react";

/** Focusable elements per the UI spec: keyboard-operable controls only. */
export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function visibleFocusable(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => {
    if (typeof el.getClientRects !== "function") return true;
    return el.getClientRects().length > 0;
  });
}

/**
 * useContainedFocus — accessible overlay behavior (UI spec §6, §10).
 * - Moves focus inside the container on open.
 * - Traps Tab / Shift+Tab inside while open.
 * - Escape calls onEscape (Dialog closes; drawer closes).
 * - Restores focus to the element that opened the overlay on unmount.
 * Demo-safe: pure DOM behavior, no product logic.
 */
export function useContainedFocus(containerRef, { active = true, onEscape } = {}) {
  const escapeRef = useRef(onEscape);
  useEffect(() => {
    escapeRef.current = onEscape;
  });

  useEffect(() => {
    if (!active) return undefined;
    const node = containerRef.current;
    if (!node) return undefined;
    const previouslyFocused = document.activeElement;

    const initial = visibleFocusable(node);
    if (initial.length > 0) initial[0].focus();
    else if (typeof node.focus === "function") node.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        escapeRef.current?.();
        return;
      }
      if (e.key !== "Tab") return;
      const items = visibleFocusable(node);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [active, containerRef]);
}
