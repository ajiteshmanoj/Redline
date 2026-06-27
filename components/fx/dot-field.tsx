import { cn } from "@/lib/utils";

/**
 * Animated "security scan" background: a static dot-matrix, plus a red dot layer
 * revealed by a soft spotlight that drifts across — reads as a scanner sweeping
 * the surface. Pure CSS (masks + keyframes), no canvas, no JS.
 *
 * `tone="light"` for cream sections, `tone="dark"` for the night band.
 */
export function DotField({
  className,
  tone = "light",
}: {
  className?: string;
  tone?: "light" | "dark";
}) {
  const base = tone === "dark" ? "rgba(255,255,255,0.10)" : "rgba(28,24,18,0.10)";
  const red = "rgba(194,14,46,0.55)";
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {/* static dot matrix, vignetted */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, ${base} 1px, transparent 1.5px)`,
          backgroundSize: "22px 22px",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 65% at 50% 42%, black 35%, transparent 82%)",
          maskImage: "radial-gradient(ellipse 75% 65% at 50% 42%, black 35%, transparent 82%)",
        }}
      />
      {/* red dots, lit only under the drifting scanner spotlight */}
      <div
        className="absolute inset-0 motion-reduce:hidden"
        style={{
          backgroundImage: `radial-gradient(circle, ${red} 1px, transparent 1.6px)`,
          backgroundSize: "22px 22px",
          WebkitMaskImage: "radial-gradient(circle at center, black 0%, transparent 58%)",
          maskImage: "radial-gradient(circle at center, black 0%, transparent 58%)",
          WebkitMaskSize: "52% 60%",
          maskSize: "52% 60%",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          animation: "scanner-drift 8s ease-in-out infinite",
        }}
      />
    </div>
  );
}
