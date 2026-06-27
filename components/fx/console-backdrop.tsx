"use client";

// Subtle living backdrop behind the audit console feed — drifting grid, faint
// red/steel glow, and a slow scanline. Pure CSS (no WebGL) so the console stays
// perf-light and bulletproof during the live stream. Matches the hero's
// production value without competing with the feed.
export function ConsoleBackdrop({ active }: { active?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-grid opacity-[0.5] [animation:grid-drift_9s_linear_infinite]" />
      <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-redline/10 blur-3xl [animation:aurora-a_22s_ease-in-out_infinite]" />
      <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-[#3a4660]/20 blur-3xl [animation:aurora-c_26s_ease-in-out_infinite]" />
      {active ? (
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-redline/[0.06] to-transparent [animation:scan-sweep_5s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
      ) : null}
    </div>
  );
}
