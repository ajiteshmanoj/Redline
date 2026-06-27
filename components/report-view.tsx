"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  Copy,
  Check,
  Download,
  RotateCcw,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Save,
  Share2,
  Scale,
  ListChecks,
  AlertTriangle,
  Swords,
  Banknote,
  TrendingDown,
  BarChart3,
  Info,
  Gauge,
} from "lucide-react";
import Link from "next/link";
import type { AuditSummary, RiskScore } from "@/lib/types";
import type { AuditState } from "./use-audit";
import { saveReport } from "@/lib/saved-reports";
import { addSubmission } from "@/lib/benchmark-submissions";
import {
  isTransportError,
  computeRiskScore,
  SEVERITY_RUBRIC,
  tierForSeverity,
} from "@/lib/audit";
import {
  aggregateExposure,
  exposureFor,
  exposureKindLabel,
  formatSGD,
} from "@/lib/exposure";
import { DisclosurePanel } from "./disclosure-panel";
import { Button } from "./ui/button";
import { SeverityMeter } from "./severity-meter";
import { categoryMap } from "@/lib/attacks";
import {
  standardsFor,
  pdpaApplies,
  MAS_SHORT,
  MAS_FULL,
  OWASP_LABEL,
  PDPA_LABEL,
  NON_AFFILIATION,
  type StandardKind,
} from "@/lib/standards";
import { categoryVisual } from "./category-meta";
import { bandMeta } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function ReportView({
  targetName,
  state,
  proof,
  onProve,
  endpoint,
  adaptiveBotId,
  financial = false,
  benchmark,
}: {
  targetName: string;
  state: AuditState;
  proof?: AuditSummary | null;
  onProve?: () => void;
  endpoint?: string;
  // When set, shows a CTA to escalate this target with the multi-turn agent.
  adaptiveBotId?: string;
  // Financial institution → MAS proposed guidelines are in scope (FIs only).
  financial?: boolean;
  // When set (a real user-audited bot), shows "add to the public benchmark".
  benchmark?: { name: string; source?: string };
}) {
  const { summary, vulnerabilities, patches } = state;
  const [saved, setSaved] = useState(false);
  const [added, setAdded] = useState(false);
  const [showDisclosure, setShowDisclosure] = useState(false);
  if (!summary) return null;
  const band = bandMeta[summary.band];
  const exposure = aggregateExposure(vulnerabilities);
  const risk = computeRiskScore(state.results);
  const pdpaCount = vulnerabilities.filter((v) => v.category === "pii-extraction").length;
  // Prefer the count recorded in the summary; fall back to recomputing from the
  // raw results (handles older saved reports without the field).
  const erroredCount =
    summary.errored ?? state.results.filter((r) => isTransportError(r)).length;
  const allErrored = summary.total > 0 && erroredCount === summary.total;

  const onSave = () => {
    saveReport({
      targetName,
      endpoint,
      summary,
      vulnerabilities,
      patches,
      results: state.results,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const onAddToBenchmark = () => {
    if (!benchmark) return;
    addSubmission({
      name: benchmark.name,
      source: benchmark.source,
      score: summary.score,
      brokeOn: Array.from(new Set(vulnerabilities.map((v) => v.category))),
    });
    setAdded(true);
  };

  return (
    <div className="space-y-8">
      {/* ---------- Header / verdict ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="panel grain relative overflow-hidden"
      >
        <div className="absolute inset-0 -z-10 bg-grid bg-grid-fade opacity-20" />
        <div className="grid items-center gap-8 p-8 md:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center gap-3">
            <SeverityMeter value={summary.score} size={200} />
            <p className="max-w-[200px] text-center text-[11px] leading-relaxed text-chalk-faint">
              Severity-weighted across {summary.total} probes against a fixed rubric — open the
              breakdown for the per-finding math.
            </p>
          </div>
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="mono-label">Audit report</span>
              <span className="text-chalk-faint">·</span>
              <span className="font-mono text-xs text-chalk-dim">{targetName}</span>
            </div>
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-white/[0.02] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-chalk-faint">
              <ListChecks className="h-3.5 w-3.5 text-redline/80" />
              Tested against the OWASP LLM Top 10
            </p>
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {summary.headline}
            </h1>
            <p className="mt-3 max-w-xl text-chalk-dim">{band.blurb}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ScoreChip label="Attacks run" value={summary.total} />
              <ScoreChip label="Broken" value={summary.broken} tone="red" />
              <ScoreChip label="Held" value={summary.passed} tone="safe" />
              {erroredCount > 0 ? (
                <ScoreChip label="Unreachable" value={erroredCount} tone="warn" />
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-8 py-4 print:hidden">
          <span className="font-mono text-xs text-chalk-faint">
            Generated by Redline · adversarial AI security
          </span>
          <div className="flex flex-wrap gap-2">
            {vulnerabilities.length > 0 ? (
              <Button
                size="sm"
                onClick={() => setShowDisclosure((v) => !v)}
                aria-pressed={showDisclosure}
              >
                <Share2 className="h-4 w-4" /> {showDisclosure ? "Hide disclosure" : "Disclose in good faith"}
              </Button>
            ) : null}
            <Button variant="secondary" size="sm" onClick={onSave}>
              {saved ? <Check className="h-4 w-4 text-safe" /> : <Save className="h-4 w-4" />}
              {saved ? "Saved" : "Save report"}
            </Button>
            {benchmark ? (
              <Button variant="secondary" size="sm" onClick={onAddToBenchmark} disabled={added}>
                {added ? <Check className="h-4 w-4 text-safe" /> : <BarChart3 className="h-4 w-4" />}
                {added ? "Added to benchmark" : "Add to benchmark"}
              </Button>
            ) : null}
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              <Download className="h-4 w-4" /> Export PDF
            </Button>
            {adaptiveBotId ? (
              <span
                className="group/esc relative inline-flex"
                title="Single-shot probes test one message each. The adaptive agent profiles the bot, then pursues one goal over up to 5 turns — escalating as it reads each reply. It catches multi-turn breaks the static battery misses."
              >
                <Link href={`/audit/${adaptiveBotId}/adaptive`}>
                  <Button size="sm">
                    <Swords className="h-4 w-4" /> Escalate · adaptive agent
                  </Button>
                </Link>
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full right-0 z-20 mb-1.5 hidden w-72 rounded-md border border-border bg-white p-2.5 text-left text-[11px] leading-snug text-chalk-dim shadow-lg group-hover/esc:block"
                >
                  Single-shot probes test one message each. The adaptive agent profiles the bot,
                  then pursues one goal over up to 5 turns — escalating as it reads each reply. It
                  catches multi-turn breaks the static battery misses.
                </span>
              </span>
            ) : null}
            <Link href="/audit">
              <Button variant="outline" size="sm">
                <RotateCcw className="h-4 w-4" /> Audit another
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ---------- How the score is derived ---------- */}
      {risk.contributions.length > 0 ? <ScoreDerivation risk={risk} /> : null}

      {/* ---------- PDPA hero / scope ---------- */}
      {!allErrored ? <PdpaHero count={pdpaCount} /> : null}

      {/* ---------- Business exposure ---------- */}
      {vulnerabilities.length > 0 && !allErrored ? (
        <ExposureBanner exposure={exposure} />
      ) : null}

      {/* ---------- Target reachability ---------- */}
      {erroredCount > 0 ? (
        <div className="panel grain relative overflow-hidden border-warn/40 bg-warn/[0.05] p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
            <div>
              <p className="font-display text-base font-semibold text-chalk">
                {allErrored
                  ? "The target never answered — this is not a pass."
                  : "Some probes never reached the target."}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-chalk-dim">
                {erroredCount} of {summary.total} probes returned a transport error or timeout
                instead of a real reply. {allErrored ? "No attack actually landed, so the score below is not meaningful — " : "These are excluded from the held tally so an unreachable endpoint can't read as a clean pass. "}
                Check the endpoint, headers, and body template, then re-run. Errored probes are
                shown with a <span className="font-mono text-chalk">[target …]</span> marker in the
                live console.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {showDisclosure ? (
        <DisclosurePanel
          targetName={targetName}
          endpoint={endpoint}
          summary={summary}
          vulnerabilities={vulnerabilities}
          patches={patches}
        />
      ) : null}

      {/* ---------- Regulatory context + standards mapping ---------- */}
      <RegulatoryContext vulnerabilities={vulnerabilities} financial={financial} />

      {/* ---------- Vulnerabilities ---------- */}
      <div id="vulnerabilities" className="scroll-mt-24">
        <div className="mb-4 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-redline" />
          <h2 className="font-display text-xl font-semibold">
            Vulnerabilities{" "}
            <span className="text-chalk-faint">({vulnerabilities.length})</span>
          </h2>
        </div>

        {vulnerabilities.length === 0 ? (
          <div className="panel flex items-center gap-3 p-6 text-safe">
            <ShieldCheck className="h-5 w-5" />
            <p className="text-sm text-chalk-dim">
              No exploitable breaks found. This bot held the full battery.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {vulnerabilities.map((v, i) => (
              <VulnRow key={`${v.category}-${i}`} vuln={v} index={i} financial={financial} />
            ))}
          </div>
        )}
      </div>

      {/* ---------- Suggested patches ---------- */}
      {patches.length > 0 ? (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-safe" />
            <h2 className="font-display text-xl font-semibold">
              Suggested system-prompt patches
            </h2>
          </div>
          <div className="space-y-4">
            {patches.map((p) => (
              <PatchBlock key={p.category} patch={p} />
            ))}
          </div>
        </div>
      ) : null}

      {/* ---------- Prove the fix ---------- */}
      {onProve && patches.length > 0 ? (
        <ProveTheFix
          proof={proof ?? null}
          beforeScore={summary.score}
          beforeExposure={exposure.totalSGD}
          onProve={onProve}
        />
      ) : null}
    </div>
  );
}

function ProveTheFix({
  proof,
  beforeScore,
  beforeExposure,
  onProve,
}: {
  proof: AuditSummary | null;
  beforeScore: number;
  beforeExposure: number;
  onProve: () => void;
}) {
  if (proof) {
    const scoreDelta = Math.max(0, beforeScore - proof.score);
    // After hardening the bot holds the full battery, so residual exposure is ~0.
    const afterExposure = 0;
    const exposureDelta = Math.max(0, beforeExposure - afterExposure);
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel grain relative overflow-hidden border-safe/30 p-7"
      >
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(700px_circle_at_25%_0%,rgba(55,201,139,0.14),transparent_60%)]" />
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-safe/40 bg-safe/10">
            <ShieldCheck className="h-5 w-5 text-safe" />
          </div>
          <div>
            <p className="font-display text-xl font-semibold text-chalk">Fix verified — loop closed.</p>
            <p className="text-sm text-chalk-dim">
              Same {proof.total}-attack battery, re-run against the hardened bot. It now holds.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <CollapseStat
            label="Risk score"
            before={`${beforeScore}`}
            after={`${proof.score}`}
            badge={`−${scoreDelta} risk eliminated`}
          />
          <CollapseStat
            label="Estimated exposure"
            before={formatSGD(beforeExposure)}
            after={formatSGD(afterExposure)}
            badge={`${formatSGD(exposureDelta)} taken off the table`}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <div className="panel grain relative overflow-hidden p-7">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(600px_circle_at_80%_0%,rgba(255,59,59,0.10),transparent_60%)]" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-xl">
          <p className="mono-label mb-2 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-redline" /> Close the loop
          </p>
          <h3 className="font-display text-2xl font-semibold">
            Don&apos;t trust the patch — prove it.
          </h3>
          <p className="mt-1.5 text-sm text-chalk-dim">
            Apply the recommended patches and re-run the exact same battery against the hardened bot.
            Watch the severity score — and{" "}
            <span className="text-chalk">{formatSGD(beforeExposure)}</span> of exposure — collapse,
            live.
          </p>
        </div>
        <Button onClick={onProve} className="group shrink-0">
          Apply patches &amp; re-audit
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  );
}

/** A before→after collapse with the eliminated delta as a badge. */
function CollapseStat({
  label,
  before,
  after,
  badge,
}: {
  label: string;
  before: string;
  after: string;
  badge: string;
}) {
  return (
    <div className="rounded-md border border-border bg-white/[0.02] p-4">
      <p className="mono-label mb-3">{label}</p>
      <div className="flex items-center gap-3">
        <span className="font-display text-3xl font-bold tabular-nums text-redline line-through decoration-redline/40 decoration-2">
          {before}
        </span>
        <ArrowRight className="h-5 w-5 shrink-0 text-chalk-faint" />
        <span className="font-display text-3xl font-bold tabular-nums text-safe">{after}</span>
      </div>
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-safe/40 bg-safe/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-safe">
        <TrendingDown className="h-3 w-3" /> {badge}
      </span>
    </div>
  );
}

/**
 * Standards tags for a finding: OWASP (always), PDPA (data-disclosure findings),
 * MAS (financial targets only — the proposed guidelines apply to FIs). Visible
 * in print. Colour-coded by framework so they're scannable.
 */
const STANDARD_TONE: Record<StandardKind, string> = {
  owasp: "border-redline/30 bg-redline/[0.06] text-redline-bright",
  pdpa: "border-amber-500/30 bg-amber-500/[0.08] text-amber-700",
  mas: "border-border bg-white/[0.03] text-chalk-dim",
};
function StandardsTags({
  category,
  financial,
}: {
  category: AuditState["vulnerabilities"][number]["category"];
  financial: boolean;
}) {
  return (
    <>
      {standardsFor(category, financial).map((t) => (
        <span
          key={t.kind}
          className="group/std relative inline-flex"
          // title is the print/no-hover fallback for the same detail.
          title={`${t.control} — ${t.why}`}
        >
          <span
            className={cn(
              "inline-flex cursor-help items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider",
              STANDARD_TONE[t.kind],
            )}
          >
            {t.label}
          </span>
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-0 z-20 mb-1.5 hidden w-60 rounded-md border border-border bg-white p-2.5 text-left shadow-lg group-hover/std:block print:hidden"
          >
            <span className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-chalk">
              {t.control}
            </span>
            <span className="mt-1 block text-[11px] normal-case leading-snug tracking-normal text-chalk-dim">
              {t.why}
            </span>
          </span>
        </span>
      ))}
    </>
  );
}

/**
 * Regulatory context block + standards mapping. Scoping is deliberate and
 * accurate: OWASP applies to every LLM app; PDPA to findings that disclose
 * personal data; the MAS *proposed* guidelines (a Nov 2025 consultation paper)
 * to financial institutions only.
 */
function RegulatoryContext({
  vulnerabilities,
  financial,
}: {
  vulnerabilities: AuditState["vulnerabilities"];
  financial: boolean;
}) {
  // Distinct OWASP entries across the confirmed breaks.
  const owasp = Array.from(
    new Set(vulnerabilities.map((v) => categoryMap[v.category].owaspId)),
  ).sort();
  // PDPA is observed when any data-disclosure finding landed.
  const pdpaObserved = vulnerabilities.some((v) => pdpaApplies(v.category));
  // MAS-named risks — only relevant for financial institutions.
  const mas = financial
    ? Array.from(
        new Set(
          vulnerabilities
            .map((v) => categoryMap[v.category].masRisk)
            .filter((m): m is NonNullable<typeof m> => Boolean(m)),
        ),
      ).sort()
    : [];

  return (
    <div className="panel grain relative overflow-hidden p-6">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(620px_circle_at_15%_0%,rgba(255,59,59,0.06),transparent_60%)]" />
      <div className="mb-3 flex items-center gap-2">
        <Scale className="h-4 w-4 text-redline" />
        <h2 className="font-display text-xl font-semibold">Standards &amp; regulatory context</h2>
      </div>

      <p className="max-w-3xl text-sm leading-relaxed text-chalk-dim">
        Every finding is mapped to the <span className="text-chalk">{OWASP_LABEL}</span>, the
        vendor-neutral framework for LLM application security. Findings that disclose personal data
        are flagged against Singapore&apos;s <span className="text-chalk">PDPA</span>.{" "}
        {financial ? (
          <>
            As a financial institution, this target is also mapped to the{" "}
            <span className="text-chalk">{MAS_FULL}</span> — note this is a{" "}
            <span className="text-chalk">proposed</span> guideline out for consultation, not yet in
            force.
          </>
        ) : (
          <>
            The <span className="text-chalk">{MAS_SHORT}</span> apply to financial institutions only,
            so they are not mapped for this target.
          </>
        )}
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-white/[0.02] p-4">
          <p className="mono-label mb-2.5">OWASP LLM Top 10 — observed</p>
          {owasp.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {owasp.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center rounded border border-redline/30 bg-redline/[0.06] px-2 py-0.5 font-mono text-[11px] text-redline-bright"
                >
                  {id}
                </span>
              ))}
              {pdpaObserved ? (
                <span className="inline-flex items-center rounded border border-amber-500/30 bg-amber-500/[0.08] px-2 py-0.5 font-mono text-[11px] text-amber-700">
                  {PDPA_LABEL}: personal data disclosed
                </span>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-chalk-faint">
              No breaks — no OWASP categories triggered across the full battery.
            </p>
          )}
        </div>
        <div className="rounded-md border border-border bg-white/[0.02] p-4">
          <p className="mono-label mb-2.5">
            {financial ? "MAS-named risks — observed" : "MAS — scope"}
          </p>
          {!financial ? (
            <p className="text-sm text-chalk-faint">
              Not a financial institution — the {MAS_SHORT} are out of scope for this target.
            </p>
          ) : mas.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {mas.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center rounded border border-border bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-chalk-dim"
                >
                  {m}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-chalk-faint">
              None of the MAS-named risks were triggered.
            </p>
          )}
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-chalk-faint">{NON_AFFILIATION}</p>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Score derivation — the rubric + per-finding math behind the ring.          */
/* ------------------------------------------------------------------------- */

const TIER_TONE: Record<string, string> = {
  critical: "text-redline",
  high: "text-redline/80",
  moderate: "text-warn",
  low: "text-chalk-dim",
};

function ScoreDerivation({ risk }: { risk: RiskScore }) {
  const [open, setOpen] = useState(false);
  const activeTiers = new Set(risk.contributions.map((c) => c.tier));

  // Plain-words rule for why the score is what it is — never a flat 100.
  const rule =
    risk.driver === "saturation"
      ? `Saturated worst case — ${risk.contributions.filter((c) => c.severity >= 9).length} critical breaks across most categories push the score into the reserved 97–100 band.`
      : risk.driver === "floor"
        ? `A single critical break alone floors the score into the critical band (worst break sev ${risk.floorSeverity} → ${risk.floor}). One ship-blocking break is enough.`
        : `The severity-weighted total lands at ${risk.accumulated}. The curve saturates and is capped at ${risk.cap} — ${risk.cap === risk.score ? "this is the realistic maximum" : `97–100 is reserved for a saturated worst case, so a real critical reads ${risk.score}, not 100`}.`;

  return (
    <div className="panel overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        <Gauge className="h-4 w-4 shrink-0 text-redline" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold text-chalk">
            How this score is derived
          </p>
          <p className="mt-0.5 text-xs text-chalk-faint">
            Risk {risk.score}/100 · severity-weighted across the broken probes against a fixed rubric.
          </p>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-chalk-faint transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div className="space-y-5 border-t border-border px-5 py-5">
          {/* Rubric */}
          <div>
            <p className="mono-label mb-2.5">Severity rubric</p>
            <div className="overflow-hidden rounded-md border border-border">
              {SEVERITY_RUBRIC.map((t) => {
                const active = activeTiers.has(t.id);
                return (
                  <div
                    key={t.id}
                    className={cn(
                      "flex items-start gap-3 border-b border-border px-3 py-2 last:border-b-0",
                      active ? "bg-redline/[0.05]" : "opacity-60",
                    )}
                  >
                    <span
                      className={cn(
                        "w-24 shrink-0 font-mono text-[11px] uppercase tracking-wider",
                        TIER_TONE[t.id],
                      )}
                    >
                      {t.label}
                      <span className="block text-[10px] text-chalk-faint">
                        sev {t.range[0]}–{t.range[1]}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1 text-xs leading-relaxed text-chalk-dim">
                      <span className="text-chalk">{t.meaning}</span>{" "}
                      <span className="text-chalk-faint">e.g. {t.example}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per-finding contributions */}
          <div>
            <p className="mono-label mb-2.5">Per-finding contribution</p>
            <div className="space-y-1.5">
              {risk.contributions.map((c, i) => (
                <div
                  key={`${c.category}-${i}`}
                  className="flex items-center gap-3 font-mono text-xs"
                >
                  <span className="min-w-0 flex-1 truncate text-chalk-dim">
                    {categoryMap[c.category].label}
                    <span className="text-chalk-faint">
                      {" "}
                      · {tierForSeverity(c.severity).label} (sev {c.severity})
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-redline">+{c.points}</span>
                </div>
              ))}
              <div className="mt-2 flex items-center gap-3 border-t border-border pt-2 font-mono text-xs">
                <span className="flex-1 text-chalk">Accumulated severity score</span>
                <span className="shrink-0 tabular-nums text-chalk">{risk.accumulated}</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="flex-1 text-chalk-faint">
                  Worst-break floor (sev {risk.floorSeverity})
                </span>
                <span className="shrink-0 tabular-nums text-chalk-faint">{risk.floor}</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="flex-1 text-chalk-faint">Realistic cap (97–100 reserved)</span>
                <span className="shrink-0 tabular-nums text-chalk-faint">{risk.cap}</span>
              </div>
              <div className="mt-1 flex items-center gap-3 border-t border-border pt-2 font-mono text-sm">
                <span className="flex-1 font-semibold text-chalk">Risk score</span>
                <span className="shrink-0 font-bold tabular-nums text-redline">{risk.score}</span>
              </div>
            </div>
          </div>

          <p className="flex items-start gap-2 rounded-md border border-border bg-white/[0.02] px-3 py-2.5 text-xs leading-relaxed text-chalk-dim">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-redline/70" />
            <span>{rule}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* PDPA hero — the headline regulatory hook for a Singapore audience.         */
/* ------------------------------------------------------------------------- */

function PdpaHero({ count }: { count: number }) {
  if (count === 0) {
    return (
      <div className="panel flex items-center gap-2.5 px-5 py-3 text-sm text-chalk-dim">
        <ShieldCheck className="h-4 w-4 shrink-0 text-safe" />
        No personal-data disclosure detected · PDPA scope clear.
      </div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel grain relative overflow-hidden border-redline/40 p-7 sm:p-9"
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(680px_circle_at_12%_0%,rgba(255,59,59,0.10),transparent_62%)]" />
      <div className="absolute left-0 top-0 h-full w-1 bg-redline" />
      <p className="mono-label mb-3 flex items-center gap-2">
        <Scale className="h-3.5 w-3.5 text-redline" /> PDPA exposure ·{" "}
        {count} personal-data finding{count === 1 ? "" : "s"}
      </p>
      <h2 className="max-w-2xl font-display text-3xl font-bold leading-tight tracking-tight text-chalk sm:text-4xl">
        This is a <span className="text-redline">PDPA breach</span> waiting to happen.
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-chalk-dim">
        Your bot leaked personal data. Under Singapore&apos;s PDPA, that&apos;s{" "}
        <span className="font-semibold text-chalk">your</span> breach to report — not the model
        vendor&apos;s. Penalties reach{" "}
        <span className="font-semibold text-chalk">
          up to S$1M, or 10% of annual turnover, whichever is higher.
        </span>
      </p>
      <a
        href="#vulnerabilities"
        className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-redline transition-opacity hover:opacity-80"
      >
        Jump to the {count} finding{count === 1 ? "" : "s"} <ArrowRight className="h-3.5 w-3.5" />
      </a>
      <p className="mt-5 max-w-3xl border-t border-border pt-4 text-xs leading-relaxed text-chalk-faint">
        The 10%-of-turnover cap applies to organisations with annual Singapore turnover above S$10M;
        smaller organisations are capped at S$1M. PDPA financial penalties apply to intentional or
        negligent breaches, not accidents where the organisation took reasonable care — this is
        exposure, not an automatic fine. Authority: Section 48J, PDPA; enhanced penalties in force
        since 1 October 2022.
      </p>
    </motion.div>
  );
}

/**
 * Headline business/regulatory exposure. Translates severity into the number a
 * founder or VC actually feels. Methodology is surfaced inline so the figure
 * reads as indicative order-of-magnitude, never a precise liability quote.
 */
function ExposureBanner({
  exposure,
}: {
  exposure: ReturnType<typeof aggregateExposure>;
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [lo, hi] = exposure.rangeSGD;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel grain relative overflow-hidden border-redline/30 p-6"
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(620px_circle_at_85%_0%,rgba(255,59,59,0.10),transparent_60%)]" />
      <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
        <div className="md:border-r md:border-border md:pr-6">
          <p className="mono-label mb-2 flex items-center gap-2">
            <Banknote className="h-3.5 w-3.5 text-redline" /> Estimated exposure
          </p>
          <p className="font-display text-4xl font-bold leading-none tracking-tight text-redline sm:text-5xl">
            {formatSGD(exposure.totalSGD)}
          </p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-chalk-faint">
            range {formatSGD(lo)} – {formatSGD(hi)}
          </p>
        </div>
        <div>
          <p className="text-sm leading-relaxed text-chalk-dim">
            Left unfixed, the confirmed breaks below put an estimated{" "}
            <span className="font-semibold text-chalk">{formatSGD(exposure.totalSGD)}</span> on the
            table — driven by{" "}
            <span className="text-chalk">{exposure.topBasis.toLowerCase()}</span>.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {exposure.drivers.map((d) => (
              <span
                key={d}
                className="inline-flex items-center rounded border border-border bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-chalk-dim"
              >
                {exposureKindLabel(d)}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-chalk-faint">
            Indicative, severity-scaled, Singapore-anchored (PDPA penalty ceiling, fraud-window
            losses, claim liability). Regulatory caps don&apos;t stack. Not a precise liability
            figure — an order-of-magnitude of what&apos;s at risk.
          </p>
        </div>
      </div>

      {/* How this is estimated — per-break itemisation that reconciles to total */}
      <div className="mt-5 border-t border-border pt-4">
        <button
          onClick={() => setShowBreakdown((v) => !v)}
          aria-expanded={showBreakdown}
          className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-chalk-dim transition-colors hover:text-chalk"
        >
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", showBreakdown && "rotate-180")}
          />
          How this is estimated
        </button>

        {showBreakdown ? (
          <div className="mt-4 overflow-hidden rounded-md border border-border">
            <div className="grid grid-cols-[1fr_auto] gap-x-4 bg-white/[0.02] px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-chalk-faint sm:grid-cols-[1.4fr_0.9fr_auto_auto]">
              <span>Finding</span>
              <span className="hidden sm:block">Basis</span>
              <span className="hidden text-right sm:block">Sev</span>
              <span className="text-right">Contribution</span>
            </div>
            {exposure.lines.map((l, i) => (
              <div
                key={`${l.category}-${i}`}
                className={cn(
                  "grid grid-cols-[1fr_auto] gap-x-4 border-t border-border px-3 py-2 text-xs sm:grid-cols-[1.4fr_0.9fr_auto_auto]",
                  !l.included && "opacity-50",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-chalk">
                    {l.title ?? categoryMap[l.category].label}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-chalk-faint">
                    {exposureKindLabel(l.kind)}
                  </span>
                </span>
                <span className="hidden text-[11px] leading-snug text-chalk-dim sm:block">
                  {l.basis}
                </span>
                <span className="hidden text-right font-mono tabular-nums text-chalk-dim sm:block">
                  {l.severity}
                </span>
                <span className="text-right font-mono tabular-nums">
                  {l.included ? (
                    <span className="text-chalk">{formatSGD(l.amountSGD)}</span>
                  ) : (
                    <span className="text-chalk-faint line-through decoration-chalk-faint/50">
                      {formatSGD(l.amountSGD)}
                    </span>
                  )}
                </span>
              </div>
            ))}
            {exposure.regulatoryAdjustmentSGD > 0 ? (
              <div className="grid grid-cols-[1fr_auto] gap-x-4 border-t border-border bg-white/[0.02] px-3 py-2 text-xs">
                <span className="text-chalk-dim">
                  Caps don&apos;t stack — PDPA regulatory ceiling counted once, not per finding
                </span>
                <span className="text-right font-mono tabular-nums text-chalk-faint">
                  −{formatSGD(exposure.regulatoryAdjustmentSGD)}
                </span>
              </div>
            ) : null}
            <div className="grid grid-cols-[1fr_auto] gap-x-4 border-t border-border bg-white/[0.02] px-3 py-2.5 text-sm">
              <span className="font-semibold text-chalk">Estimated exposure</span>
              <span className="text-right font-mono font-bold tabular-nums text-redline">
                {formatSGD(exposure.totalSGD)}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

function ScoreChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "red" | "safe" | "warn";
}) {
  return (
    <div className="rounded-md border border-border bg-white/[0.02] px-4 py-2">
      <span
        className={cn(
          "font-display text-xl font-bold tabular-nums",
          tone === "red"
            ? "text-redline"
            : tone === "safe"
              ? "text-safe"
              : tone === "warn"
                ? "text-warn"
                : "text-chalk",
        )}
      >
        {value}
      </span>
      <span className="ml-2 font-mono text-[11px] uppercase tracking-wider text-chalk-faint">
        {label}
      </span>
    </div>
  );
}

function VulnRow({
  vuln,
  index,
  financial,
}: {
  vuln: AuditState["vulnerabilities"][number];
  index: number;
  financial: boolean;
}) {
  const [open, setOpen] = useState(index === 0);
  const Icon = categoryVisual[vuln.category].icon;
  const sevTone = vuln.severity >= 8 ? "text-redline" : vuln.severity >= 5 ? "text-warn" : "text-chalk-dim";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="panel overflow-hidden"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        <span className={cn("font-display text-2xl font-bold tabular-nums", sevTone)}>
          {vuln.severity.toFixed(1)}
        </span>
        <div className="h-9 w-px bg-border" />
        <Icon className="h-5 w-5 shrink-0 text-redline" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-chalk">{vuln.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-chalk-faint">
              {categoryMap[vuln.category].label}
            </span>
            <StandardsTags category={vuln.category} financial={financial} />
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-chalk-faint transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="border-t border-border px-5 py-4">
          <p className="mb-3 flex items-start gap-2 rounded-md bg-redline/[0.07] px-3 py-2 text-sm text-redline-bright">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {vuln.reason}
          </p>
          <ExposureLine category={vuln.category} severity={vuln.severity} />
          <p className="mono-label mb-2">Proof transcript</p>
          <div className="space-y-2 rounded-md border border-border bg-ink-900/60 p-4 font-mono text-xs leading-relaxed">
            <div className="flex gap-2.5">
              <span className="shrink-0 font-semibold text-redline/80">▸ attacker</span>
              <span className="whitespace-pre-wrap text-chalk-dim">{vuln.prompt}</span>
            </div>
            <div className="flex gap-2.5">
              <span className="shrink-0 font-semibold text-redline-bright">◂ bot</span>
              <span className="whitespace-pre-wrap text-chalk">{vuln.response}</span>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}

/** Per-finding exposure line shown inside an expanded vulnerability. */
function ExposureLine({
  category,
  severity,
}: {
  category: AuditState["vulnerabilities"][number]["category"];
  severity: number;
}) {
  const e = exposureFor(category, severity);
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border bg-white/[0.02] px-3 py-2">
      <span className="inline-flex items-center gap-1.5 font-display text-base font-bold text-redline">
        <Banknote className="h-4 w-4" />
        {formatSGD(e.amountSGD)}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-wider text-chalk-faint">
        {exposureKindLabel(e.kind)}
      </span>
      <span className="text-xs text-chalk-dim">{e.basis}</span>
    </div>
  );
}

function PatchBlock({ patch }: { patch: AuditState["patches"][number] }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(patch.patch);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div>
          <p className="font-medium text-chalk">{patch.title}</p>
          <p className="mt-0.5 text-xs text-chalk-faint">{patch.rationale}</p>
        </div>
        <button
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-white/[0.03] px-3 py-1.5 font-mono text-xs text-chalk-dim transition-colors hover:border-white/20 hover:text-chalk"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-safe" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap break-words bg-ink-900/60 px-5 py-4 font-mono text-xs leading-relaxed text-safe">
        {patch.patch}
      </pre>
    </div>
  );
}
