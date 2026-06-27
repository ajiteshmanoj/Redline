"use client";

import { useEffect, useState } from "react";
import { useMotionValue, useSpring, useTransform, motion } from "framer-motion";
import { bandFor, bandMeta } from "@/lib/utils";

const RADIUS = 86;
const CIRC = 2 * Math.PI * RADIUS;

const toneColor = { red: "#FF3B3B", warn: "#F5A623", safe: "#37C98B" } as const;

export function SeverityMeter({
  value,
  size = 220,
  live = false,
}: {
  value: number;
  size?: number;
  live?: boolean;
}) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 55, damping: 16, mass: 1.1 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    mv.set(value);
  }, [value, mv]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => setDisplay(Math.round(v)));
    return () => unsub();
  }, [spring]);

  const band = bandFor(display);
  const tone = bandMeta[band].tone;
  const color = toneColor[tone];

  const dashoffset = useTransform(spring, (v) => CIRC - (Math.min(100, Math.max(0, v)) / 100) * CIRC);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 200 200" className="-rotate-90">
        {/* track */}
        <circle
          cx="100"
          cy="100"
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="10"
        />
        {/* progress */}
        <motion.circle
          cx="100"
          cy="100"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          style={{ strokeDashoffset: dashoffset, filter: `drop-shadow(0 0 10px ${color}aa)` }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={tone}
          className="font-display text-6xl font-bold tabular-nums"
          style={{ color }}
        >
          {display}
        </motion.span>
        <span className="mono-label mt-1">risk score</span>
        <span
          className="mt-2 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ color, borderColor: `${color}55`, background: `${color}14` }}
        >
          {bandMeta[band].label}
        </span>
      </div>

      {live ? (
        <span
          className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full"
          style={{ background: color, boxShadow: `0 0 12px 2px ${color}` }}
        />
      ) : null}
    </div>
  );
}
