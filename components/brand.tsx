import { cn } from "@/lib/utils";

export function Logomark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-7 w-7 items-center justify-center rounded-full border border-redline/30 bg-redline/[0.08]",
        className,
      )}
      aria-hidden
    >
      {/* crosshair / target mark */}
      <span className="absolute inset-0 m-auto h-[1.5px] w-3.5 bg-redline" />
      <span className="absolute inset-0 m-auto h-3.5 w-[1.5px] bg-redline" />
      <span className="h-1.5 w-1.5 rounded-full bg-redline" />
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Logomark />
      <span className="font-display text-xl font-semibold tracking-tight text-chalk">
        Redline
      </span>
    </span>
  );
}
