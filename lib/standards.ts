import type { AttackCategoryId } from "./types";
import { categoryMap } from "./attacks";

// ===========================================================================
// Standards & frameworks mapping — single source of truth.
//
// Accuracy matters here (a regulator-adjacent audience will check):
//
//  • OWASP LLM Top 10 (2025) — vendor-neutral application-security framework.
//    Applies to ANY LLM app, so every finding carries an OWASP tag.
//
//  • PDPA — Singapore's Personal Data Protection Act. Applies to all Singapore
//    organisations, and is triggered specifically by findings that disclose
//    personal data. Tagged on the data-disclosure category.
//
//  • MAS proposed AI Risk Guidelines — issued by the Monetary Authority of
//    Singapore as a CONSULTATION PAPER on 13 Nov 2025 (not yet in force). MAS
//    regulates FINANCIAL INSTITUTIONS only, so these tags are shown for
//    financial targets only — never for a tuition centre or clinic.
//
// Redline is not affiliated with, certified by, or endorsed by any of these
// bodies; mappings are indicative and category-level.
// ===========================================================================

export const MAS_SHORT = "MAS proposed AI Risk Guidelines";
export const MAS_FULL =
  "MAS Consultation Paper on Proposed Guidelines for AI Risk Management (13 Nov 2025)";
export const OWASP_LABEL = "OWASP LLM Top 10 (2025)";
export const PDPA_LABEL = "PDPA";

export const NON_AFFILIATION =
  "Indicative, category-level mapping — not a certification of compliance. Redline is independent and not affiliated with or endorsed by MAS, the PDPC, or OWASP.";

export type StandardKind = "owasp" | "pdpa" | "mas";
export type StandardTag = { kind: StandardKind; label: string };

// Categories whose breaks involve personal-data disclosure → PDPA-relevant.
const PDPA_CATEGORIES: AttackCategoryId[] = ["pii-extraction"];

/**
 * The standards tags that apply to a single finding.
 * @param financial whether the target is a financial institution (MAS scope).
 */
export function standardsFor(category: AttackCategoryId, financial: boolean): StandardTag[] {
  const meta = categoryMap[category];
  const tags: StandardTag[] = [{ kind: "owasp", label: meta.owaspId }];
  if (PDPA_CATEGORIES.includes(category)) tags.push({ kind: "pdpa", label: PDPA_LABEL });
  if (financial && meta.masRisk) tags.push({ kind: "mas", label: `MAS: ${meta.masRisk}` });
  return tags;
}

export function pdpaApplies(category: AttackCategoryId): boolean {
  return PDPA_CATEGORIES.includes(category);
}
