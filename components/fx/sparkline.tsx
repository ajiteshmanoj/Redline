// Pure-SVG sparkline for risk-score-over-time. No deps, server-renderable.
// Risk semantics: HIGHER is worse, so the area is tinted red and the last
// point is colored by its band tone.

import { cn } from "@/lib/utils";

export function Sparkline({
  values,
  width = 180,
  height = 44,
  className,
  tone = "auto",
}: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  // "auto" colors the last point red/amber/green by its value.
  tone?: "auto" | "red" | "safe";
}) {
  if (values.length === 0) return null;
  const max = 100;
  const min = 0;
  const pad = 4;
  const w = width;
  const h = height;
  const span = Math.max(1, values.length - 1);

  const x = (i: number) => pad + (i / span) * (w - pad * 2);
  const y = (v: number) => {
    const t = (v - min) / (max - min);
    return h - pad - t * (h - pad * 2);
  };

  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const line = `M ${points.join(" L ")}`;
  const area = `${line} L ${x(values.length - 1).toFixed(1)},${h - pad} L ${x(0).toFixed(1)},${h - pad} Z`;

  const last = values[values.length - 1];
  const lastColor =
    tone === "red"
      ? "#FF3B3B"
      : tone === "safe"
        ? "#37C98B"
        : last >= 60
          ? "#FF3B3B"
          : last >= 35
            ? "#E0A020"
            : "#37C98B";

  const gid = `spark-${values.join("-")}-${width}`;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lastColor} stopOpacity="0.22" />
          <stop offset="100%" stopColor={lastColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={lastColor} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(values.length - 1)} cy={y(last)} r="2.75" fill={lastColor} />
    </svg>
  );
}
