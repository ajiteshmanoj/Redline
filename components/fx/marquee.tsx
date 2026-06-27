"use client";

import { cn } from "@/lib/utils";

// Seamless infinite marquee ribbon. Renders two copies for a gapless loop.
export function Marquee({
  items,
  className,
  speed = 38,
}: {
  items: string[];
  className?: string;
  speed?: number;
}) {
  return (
    <div className={cn("group relative flex overflow-hidden", className)}>
      <div
        className="flex shrink-0 items-center gap-10 pr-10 [animation:marquee_linear_infinite] group-hover:[animation-play-state:paused]"
        style={{ animationDuration: `${speed}s` }}
      >
        {items.map((it, i) => (
          <MarqueeItem key={`a-${i}`} text={it} />
        ))}
      </div>
      <div
        aria-hidden
        className="flex shrink-0 items-center gap-10 pr-10 [animation:marquee_linear_infinite] group-hover:[animation-play-state:paused]"
        style={{ animationDuration: `${speed}s` }}
      >
        {items.map((it, i) => (
          <MarqueeItem key={`b-${i}`} text={it} />
        ))}
      </div>
    </div>
  );
}

function MarqueeItem({ text }: { text: string }) {
  return (
    <span className="flex items-center gap-10 font-mono text-sm uppercase tracking-[0.18em] text-chalk-faint">
      {text}
      <span className="h-1 w-1 rounded-full bg-redline/60" />
    </span>
  );
}
