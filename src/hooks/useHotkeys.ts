"use client";

import { useEffect, useRef } from "react";

export type KeyHandler = (e: KeyboardEvent) => boolean | void;

/**
 * One global keydown listener. The handler returns true when it handled the key
 * (we then preventDefault). Keys typed into inputs are ignored.
 */
export function useHotkeys(handler: KeyHandler) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (ref.current(e) === true) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/** 1–9 from the top row or numpad, regardless of Shift (Shift+1 gives "!" as e.key). */
export function digitFromEvent(e: KeyboardEvent): number | null {
  const m = e.code.match(/^(?:Digit|Numpad)([1-9])$/);
  return m ? Number(m[1]) : null;
}
