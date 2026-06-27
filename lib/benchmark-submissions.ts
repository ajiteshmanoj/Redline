import type { AttackCategoryId } from "./types";

// ===========================================================================
// Real audits that opt into the benchmark. Stored in localStorage (no backend),
// so they're per-device — but they turn the leaderboard from a static seeded
// study into something fed by bots people actually audit. The data-moat shape,
// at hackathon scale.
// ===========================================================================

export type BenchmarkSubmission = {
  id: string;
  name: string;
  source?: string; // "pasted" | "github:owner/repo" | "http"
  score: number; // 0-100 risk
  brokeOn: AttackCategoryId[];
  date: string; // ISO
};

const KEY = "redline.benchmarkSubmissions";
const MAX = 25;

export function readSubmissions(): BenchmarkSubmission[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as BenchmarkSubmission[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function addSubmission(sub: Omit<BenchmarkSubmission, "id" | "date">): BenchmarkSubmission {
  const entry: BenchmarkSubmission = {
    ...sub,
    id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    date: new Date().toISOString(),
  };
  const next = [entry, ...readSubmissions()].slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full / unavailable — non-fatal */
  }
  return entry;
}

export function clearSubmissions(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}
