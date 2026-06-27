"use client";

import { useEffect, useState } from "react";

// Types text once on mount, bounded so it always finishes within ~maxMs
// regardless of length (keeps the console feed in cadence). Reveals in chunks
// so very long responses don't spam re-renders.
export function Typewriter({
  text,
  maxMs = 650,
  className,
}: {
  text: string;
  maxMs?: number;
  className?: string;
}) {
  const [n, setN] = useState(0);

  useEffect(() => {
    const steps = Math.min(text.length, Math.max(1, Math.floor(maxMs / 18)));
    const chunk = Math.ceil(text.length / steps);
    let i = 0;
    const id = setInterval(() => {
      i += chunk;
      if (i >= text.length) {
        setN(text.length);
        clearInterval(id);
      } else {
        setN(i);
      }
    }, 18);
    return () => clearInterval(id);
  }, [text, maxMs]);

  const done = n >= text.length;
  return (
    <span className={className}>
      {text.slice(0, n)}
      {!done ? <span className="ml-px inline-block animate-pulse text-redline">▋</span> : null}
    </span>
  );
}
