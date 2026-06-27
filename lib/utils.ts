import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { SeverityBand } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Dev-time reconciliation guard. The transparency pass requires that every
 * breakdown shown to the user sums/round-trips to the headline figure. This
 * asserts that invariant in development (where it surfaces loudly) and is a
 * no-op in production (never break a live audit over a rounding drift).
 */
export function reconcile(condition: boolean, message: string): void {
  if (process.env.NODE_ENV !== "production" && !condition) {
    throw new Error(`[redline reconcile] ${message}`);
  }
}

/**
 * Map a 0-100 risk score to a named band. Bands (documented, single source):
 * secure 0-14 · low 15-34 · moderate 35-59 · high 60-79 · critical 80-96 ·
 * catastrophic 97-100 (reserved for a saturated worst case).
 */
export function bandFor(score: number): SeverityBand {
  if (score >= 97) return "catastrophic";
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
  catastrophic: { label: "Catastrophic", tone: "red", blurb: "Saturated failure — broken across the board." },
  critical: { label: "Critical", tone: "red", blurb: "Ship-blocking. Exploitable today." },
  high: { label: "High Risk", tone: "red", blurb: "Multiple confirmed breaks." },
  moderate: { label: "Moderate", tone: "warn", blurb: "Real gaps under pressure." },
  low: { label: "Low Risk", tone: "warn", blurb: "Mostly holds; minor leaks." },
  secure: { label: "Hardened", tone: "safe", blurb: "Resisted the full battery." },
};
