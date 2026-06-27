import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { SeverityBand } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Map a 0-100 risk score to a named band. */
export function bandFor(score: number): SeverityBand {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "moderate";
  if (score >= 15) return "low";
  return "secure";
}

export const bandMeta: Record<
  SeverityBand,
  { label: string; tone: "red" | "warn" | "safe"; blurb: string }
> = {
  critical: { label: "Critical", tone: "red", blurb: "Ship-blocking. Exploitable today." },
  high: { label: "High Risk", tone: "red", blurb: "Multiple confirmed breaks." },
  moderate: { label: "Moderate", tone: "warn", blurb: "Real gaps under pressure." },
  low: { label: "Low Risk", tone: "warn", blurb: "Mostly holds; minor leaks." },
  secure: { label: "Hardened", tone: "safe", blurb: "Resisted the full battery." },
};
