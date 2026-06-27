"use client";

import { useEffect, useRef } from "react";

// A soft red light that tracks the cursor over its container. Gives the hero a
// "console under inspection" feel. Falls back to centered if no pointer moves.
export function Spotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;

    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = parent.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        el.style.background = `radial-gradient(600px circle at ${x}px ${y}px, rgba(255,59,59,0.10), transparent 45%)`;
      });
    };
    parent.addEventListener("pointermove", onMove);
    return () => {
      parent.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} className="pointer-events-none absolute inset-0 z-10 transition-[background] duration-200" aria-hidden />;
}
