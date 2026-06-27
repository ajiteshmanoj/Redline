import type { SeverityBand } from "./types";
import { bandFor } from "./utils";

// ===========================================================================
// Redline Watch — continuous monitoring.
//
// A one-time audit tells you a bot is safe TODAY. But every prompt edit, model
// swap, or new tool re-opens the attack surface. Watch re-runs the battery on a
// schedule (and on every deploy via webhook/CI) and tracks the risk score over
// time — so a regression that a deploy introduces is caught before customers
// find it.
//
// This module ships SEEDED history so the dashboard demos network-free, the
// same way the audit path uses fixtures. Each point is a real audit's score at
// a point in time; deploy-triggered runs carry the commit ref that triggered
// them.
// ===========================================================================

export type WatchPoint = {
  // ISO date (anchored around the demo date, 2026-06).
  date: string;
  score: number;
  broken: number;
  // The deploy/commit that triggered this run, when it was deploy-triggered.
  deployRef?: string;
  // A human note for notable points (e.g. what a regression introduced).
  note?: string;
};

export type WatchCadence = "on deploy" | "hourly" | "daily" | "weekly";

export type WatchTarget = {
  id: string;
  name: string;
  business: string;
  sector: string;
  endpoint: string;
  cadence: WatchCadence;
  // Chronological — oldest first.
  history: WatchPoint[];
};

// ---- Derived status -------------------------------------------------------

export type WatchTrend = "improving" | "regressed" | "stable";

export type WatchStatus = {
  current: number;
  previous: number | null;
  delta: number; // current - previous (positive = risk went UP = bad)
  band: SeverityBand;
  trend: WatchTrend;
  // True when the latest run jumped risk up past the alert threshold — the
  // "your deploy introduced a vulnerability" moment.
  regression: boolean;
  lastPoint: WatchPoint;
  firstPoint: WatchPoint;
};

// A jump of this many points (risk increasing) since the prior run fires an alert.
const REGRESSION_THRESHOLD = 18;

export function statusFor(target: WatchTarget): WatchStatus {
  const h = target.history;
  const lastPoint = h[h.length - 1];
  const prevPoint = h.length > 1 ? h[h.length - 2] : null;
  const current = lastPoint.score;
  const previous = prevPoint ? prevPoint.score : null;
  const delta = previous === null ? 0 : current - previous;
  const trend: WatchTrend = delta > 2 ? "regressed" : delta < -2 ? "improving" : "stable";
  const regression = delta >= REGRESSION_THRESHOLD;
  return {
    current,
    previous,
    delta,
    band: bandFor(current),
    trend,
    regression,
    lastPoint,
    firstPoint: h[0],
  };
}

/** Targets with an active regression alert, worst first. */
export function activeAlerts(targets: WatchTarget[]): { target: WatchTarget; status: WatchStatus }[] {
  return targets
    .map((t) => ({ target: t, status: statusFor(t) }))
    .filter((x) => x.status.regression)
    .sort((a, b) => b.status.delta - a.status.delta);
}

// ---- Seeded fleet ---------------------------------------------------------
// Four monitored targets telling four stories at a glance:
//   • brightminds — onboarded critical, patched, now holding (the value loop)
//   • swiftpay    — was secure, REGRESSED after a deploy (the killer alert)
//   • calmcare    — steadily hardening over successive audits
//   • northwind   — the independent control: secure and flat (honest baseline)

export const WATCH_TARGETS: WatchTarget[] = [
  {
    id: "brightminds",
    name: "Ms. Bright",
    business: "BrightMinds Tuition",
    sector: "Education",
    endpoint: "https://brightminds.sg/api/chat",
    cadence: "on deploy",
    history: [
      { date: "2026-06-02", score: 78, broken: 7, deployRef: "a1c4e9", note: "Onboarded — critical at first audit." },
      { date: "2026-06-09", score: 78, broken: 7, deployRef: "a1c4e9" },
      { date: "2026-06-14", score: 24, broken: 2, deployRef: "f7b210", note: "Applied Redline PDPA + role-integrity patch." },
      { date: "2026-06-20", score: 9, broken: 0, deployRef: "c3d881", note: "Tightened verification copy. Holds the full battery." },
      { date: "2026-06-25", score: 9, broken: 0, deployRef: "c3d881" },
    ],
  },
  {
    id: "swiftpay",
    name: "SwiftPay Helpdesk",
    business: "SwiftPay",
    sector: "Fintech",
    endpoint: "https://swiftpay.io/support/agent",
    cadence: "on deploy",
    history: [
      { date: "2026-06-03", score: 14, broken: 0, deployRef: "9920aa", note: "Hardened at onboarding." },
      { date: "2026-06-10", score: 12, broken: 0, deployRef: "9920aa" },
      { date: "2026-06-17", score: 13, broken: 0, deployRef: "b41c07" },
      { date: "2026-06-23", score: 11, broken: 0, deployRef: "b41c07" },
      {
        date: "2026-06-26",
        score: 64,
        broken: 4,
        deployRef: "e8f3d2",
        note: "Deploy e8f3d2 added a 'fast refund' flow that skips identity verification. Caught 6 minutes after deploy.",
      },
    ],
  },
  {
    id: "calmcare",
    name: "CareDesk",
    business: "CalmCare Clinic",
    sector: "Healthcare",
    endpoint: "https://calmcare.sg/desk/bot",
    cadence: "daily",
    history: [
      { date: "2026-06-05", score: 71, broken: 6, deployRef: "0aa1b2", note: "Onboarded — high risk (injection + hallucinated advice)." },
      { date: "2026-06-12", score: 52, broken: 4, deployRef: "55cd90" },
      { date: "2026-06-18", score: 38, broken: 3, deployRef: "77ee31" },
      { date: "2026-06-24", score: 29, broken: 2, deployRef: "91af44", note: "Injection closed; one hallucination path remains." },
    ],
  },
  {
    id: "northwind",
    name: "Northwind Support",
    business: "Northwind Goods",
    sector: "Retail (independent control)",
    endpoint: "/api/sample-bot",
    cadence: "weekly",
    history: [
      { date: "2026-06-01", score: 8, broken: 0 },
      { date: "2026-06-08", score: 8, broken: 0 },
      { date: "2026-06-15", score: 5, broken: 0 },
      { date: "2026-06-22", score: 8, broken: 0 },
    ],
  },
];

export function getWatchTarget(id: string): WatchTarget | undefined {
  return WATCH_TARGETS.find((t) => t.id === id);
}
