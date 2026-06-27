import { cn } from "@/lib/utils";

/**
 * The Redline mark: a monitored signal that spikes sharply past a red
 * threshold line — "the line you don't cross," the moment of breach, and the
 * continuous monitoring, in one glyph. Inherits color via currentColor.
 */
export function Logomark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      className={cn("h-7 w-7 text-redline", className)}
      fill="none"
      role="img"
      aria-label="Redline"
    >
      {/* the threshold being crossed */}
      <line
        x1="3"
        y1="11"
        x2="25"
        y2="11"
        stroke="currentColor"
        strokeOpacity="0.22"
        strokeWidth="1"
        strokeDasharray="2 2.5"
      />
      {/* the signal: flat → sharp spike past the line → settle */}
      <path
        d="M3 18 H10 L12 18 L15 5 L18 21 L20.5 14 H25"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* the breach point */}
      <circle cx="15" cy="5" r="1.7" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Logomark />
      <span className="font-display text-xl font-semibold tracking-tight text-chalk">Redline</span>
    </span>
  );
}
