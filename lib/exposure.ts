import type {
  AttackCategoryId,
  Exposure,
  ExposureKind,
  ExposureLineItem,
  ExposureSummary,
  Vulnerability,
} from "./types";
import { reconcile } from "./utils";

// ===========================================================================
// Exposure model — turns a confirmed break into the language a founder or VC
// actually feels: dollars and regulatory consequence.
//
// This is DELIBERATELY indicative, not actuarial. Each category has a kind
// (what sort of cost), a basis (the one-line driver), and a per-category
// ceiling that we scale by severity (1–10). The report always shows the
// methodology so the figure reads as "order-of-magnitude exposure", never as
// a precise liability quote.
//
// Figures are Singapore-anchored:
//   • PDPA financial penalty (2022 amendment): up to the HIGHER of S$1,000,000
//     or 10% of annual turnover in Singapore. We use the S$1M statutory ceiling
//     as the reference point for a PII/PDPA breach by an SME.
//   • Direct-loss figures assume a fraud/abuse window before the hole is
//     noticed and closed (unauthorised refunds, payouts, limit changes).
//   • Liability figures stand in for claims arising from unsafe advice or
//     guarantees a business is then forced to honour.
// ===========================================================================

type ExposureProfile = {
  kind: ExposureKind;
  basis: string;
  // Exposure at severity 10. Scaled down linearly toward `floor` at severity 1.
  ceilingSGD: number;
  // Exposure floor at severity 1 — even a "minor" break of this kind costs.
  floorSGD: number;
};

const PROFILES: Record<AttackCategoryId, ExposureProfile> = {
  "pii-extraction": {
    kind: "regulatory",
    basis: "PDPA financial penalty + breach notification & remediation",
    ceilingSGD: 1_000_000, // PDPA statutory ceiling for an SME
    floorSGD: 50_000,
  },
  "policy-bypass": {
    kind: "direct-loss",
    basis: "Unauthorised payouts / refunds / limit changes before the hole is closed",
    ceilingSGD: 500_000,
    floorSGD: 15_000,
  },
  "prompt-injection": {
    kind: "direct-loss",
    basis: "Hijacked actions & data exfiltration via injected instructions",
    ceilingSGD: 300_000,
    floorSGD: 10_000,
  },
  hallucination: {
    kind: "liability",
    basis: "Claims arising from confidently wrong (incl. medical/financial) advice",
    ceilingSGD: 400_000,
    floorSGD: 12_000,
  },
  "brand-damage": {
    kind: "liability",
    basis: "Guarantees the business is forced to honour + reputational fallout",
    ceilingSGD: 250_000,
    floorSGD: 8_000,
  },
  jailbreak: {
    kind: "reputational",
    basis: "Off-brand / unsafe output going public; trust & remediation cost",
    ceilingSGD: 180_000,
    floorSGD: 6_000,
  },
};

/** Severity-scaled exposure for a single confirmed break. */
export function exposureFor(category: AttackCategoryId, severity: number): Exposure {
  const p = PROFILES[category];
  const s = Math.max(1, Math.min(10, severity));
  // Linear interpolation floor→ceiling across severity 1→10.
  const t = (s - 1) / 9;
  const amount = Math.round((p.floorSGD + (p.ceilingSGD - p.floorSGD) * t) / 1000) * 1000;
  // A ±40% band conveys "estimate", not "quote".
  const low = Math.round((amount * 0.6) / 1000) * 1000;
  const high = Math.round((amount * 1.4) / 1000) * 1000;
  return {
    kind: p.kind,
    basis: p.basis,
    amountSGD: amount,
    rangeSGD: [low, high],
  };
}

// Only category + severity drive exposure, so callers can pass either full
// Vulnerability objects (static report) or lightweight {category, severity}
// pairs (adaptive campaigns). `title` is optional, surfaced in the breakdown.
export type ExposureInput = Pick<Vulnerability, "category" | "severity"> & { title?: string };

/**
 * Aggregate exposure across all confirmed breaks.
 *
 * Regulatory exposure does NOT stack — one breach hits one statutory ceiling —
 * so we take the single largest regulatory line and SUM everything else. This
 * keeps the headline defensible rather than naively additive.
 */
export function aggregateExposure(vulns: ExposureInput[]): ExposureSummary {
  if (vulns.length === 0) {
    return {
      totalSGD: 0,
      rangeSGD: [0, 0],
      topBasis: "",
      drivers: [],
      lines: [],
      naiveTotalSGD: 0,
      regulatoryAdjustmentSGD: 0,
    };
  }

  const computed = vulns.map((v) => ({ v, e: exposureFor(v.category, v.severity) }));

  // Regulatory caps don't stack — exactly one regulatory line counts (the
  // largest); the rest are dropped from the total but kept in the breakdown.
  const regulatory = computed.filter((l) => l.e.kind === "regulatory");
  const topRegulatory =
    regulatory.length > 0
      ? regulatory.reduce((a, b) => (b.e.amountSGD > a.e.amountSGD ? b : a))
      : null;

  // Per-break itemisation, sorted by contribution (biggest first), marking the
  // dropped regulatory lines so the "caps don't stack" adjustment is visible.
  const lines: ExposureLineItem[] = computed
    .map((l) => ({
      category: l.v.category,
      title: l.v.title,
      severity: l.v.severity,
      kind: l.e.kind,
      basis: l.e.basis,
      amountSGD: l.e.amountSGD,
      rangeSGD: l.e.rangeSGD,
      included: l.e.kind !== "regulatory" || l === topRegulatory,
    }))
    .sort((a, b) => b.amountSGD - a.amountSGD);

  const included = lines.filter((l) => l.included);
  const totalSGD = included.reduce((acc, l) => acc + l.amountSGD, 0);
  const low = included.reduce((acc, l) => acc + l.rangeSGD[0], 0);
  const high = included.reduce((acc, l) => acc + l.rangeSGD[1], 0);

  const naiveTotalSGD = lines.reduce((acc, l) => acc + l.amountSGD, 0);
  const regulatoryAdjustmentSGD = naiveTotalSGD - totalSGD;

  // The biggest single line drives the headline ("driven by …").
  const top = computed.reduce((a, b) => (b.e.amountSGD > a.e.amountSGD ? b : a));
  const drivers = Array.from(new Set(included.map((l) => l.kind)));

  // The breakdown must round-trip to the headline.
  reconcile(
    naiveTotalSGD - regulatoryAdjustmentSGD === totalSGD,
    "exposure lines must reconcile to total after the caps-don't-stack adjustment",
  );

  return {
    totalSGD,
    rangeSGD: [low, high],
    topBasis: top.e.basis,
    drivers,
    lines,
    naiveTotalSGD,
    regulatoryAdjustmentSGD,
  };
}

// ---- Formatting -----------------------------------------------------------

/** Compact SGD: 1_200_000 → "S$1.2M", 450_000 → "S$450K", 8_000 → "S$8K". */
export function formatSGD(amount: number): string {
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return `S$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (amount >= 1_000) return `S$${Math.round(amount / 1_000)}K`;
  return `S$${amount}`;
}

const KIND_LABEL: Record<ExposureKind, string> = {
  regulatory: "Regulatory fines",
  "direct-loss": "Direct financial loss",
  liability: "Liability",
  reputational: "Reputational damage",
};

export function exposureKindLabel(kind: ExposureKind): string {
  return KIND_LABEL[kind];
}
