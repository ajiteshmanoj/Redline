import { cn } from "@/lib/utils";

/**
 * Honest run-mode indicator. Only ever reads "live · {model}" when the run is
 * actually making live model calls; demo mode says "captured fixtures" — never
 * "live". Reflects real state passed from the stream's `start` event.
 */
export function ModeBadge({
  mode,
  model,
  running,
  className,
}: {
  mode: "demo" | "live" | null;
  model: string | null;
  running?: boolean;
  className?: string;
}) {
  if (mode === "live") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-redline/30 bg-redline/[0.08] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-redline",
          className,
        )}
        title={`Live model calls — ${model ?? "model"}`}
      >
        <span className="relative flex h-1.5 w-1.5">
          {running ? (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-redline opacity-70" />
          ) : null}
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-redline" />
        </span>
        live · {model ?? "model"}
      </span>
    );
  }
  if (mode === "demo") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-border bg-black/[0.04] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-faint",
          className,
        )}
        title="Demo mode — replaying captured fixtures, no network calls"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-chalk-faint" />
        demo · captured fixtures
      </span>
    );
  }
  return null;
}
