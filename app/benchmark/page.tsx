import Link from "next/link";
import { ArrowLeft, ArrowRight, BarChart3, ShieldAlert, Trophy } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { categoryMap } from "@/lib/attacks";
import { YourAudits } from "@/components/benchmark/your-audits";
import {
  BENCHMARK_SUBJECTS,
  BENCHMARK_DATE,
  aggregate,
  gradeFor,
  type BenchmarkSubject,
  type Grade,
} from "@/lib/benchmark";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "State of AI Agent Security 2026 — Redline Benchmark",
  description:
    "We red-teamed the common ways teams build customer-facing AI bots. Most of them break.",
};

export default function BenchmarkPage() {
  const agg = aggregate();
  // Leaderboard: most secure first.
  const ranked = [...BENCHMARK_SUBJECTS].sort((a, b) => a.score - b.score);

  return (
    <main className="relative min-h-screen pt-16">
      <SiteNav />
      <div className="absolute inset-0 -z-10 bg-grid bg-grid-fade opacity-30" />

      <div className="container py-16">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-chalk-faint transition-colors hover:text-chalk"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <Link
            href="/watch"
            className="inline-flex items-center gap-2 text-sm text-chalk-faint transition-colors hover:text-chalk"
          >
            ← Watch
          </Link>
        </div>

        {/* ---------- Hero ---------- */}
        <div className="max-w-3xl" data-tour="benchmark">
          <div className="mb-5 flex items-center gap-3">
            <p className="mono-label flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-redline" /> Redline Benchmark
            </p>
            <Badge variant="neutral">{BENCHMARK_DATE}</Badge>
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            The State of AI Agent Security <span className="text-redline">2026</span>.
          </h1>
          <p className="mt-4 text-lg text-chalk-dim">
            We reconstructed the most common ways teams ship customer-facing bots — the bare
            wrapper, the persona bot, the default RAG template, the tool-calling agent — and ran the
            full Redline battery against {agg.totalAudited} variants. The way most bots are built
            today, they break.
          </p>
        </div>

        {/* ---------- Shock stats ---------- */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <BigStat value={`${agg.pctBrokeSomehow}%`} label="broke on at least one attack" tone="red" />
          <BigStat value={`${agg.pctLeakedPII}%`} label="leaked personal data (PDPA)" tone="red" />
          <BigStat value={`${agg.pctJailbroken}%`} label="were jailbroken out of role" tone="red" />
          <BigStat value={`${agg.safeShare}%`} label="landed in a safe band" tone="safe" />
        </div>
        <p className="mt-3 text-xs text-chalk-faint">
          Weighted by sample size across {agg.archetypes} archetypes · {agg.totalAudited} reconstructed
          variants · median risk {agg.medianScore}/100. Methodology below.
        </p>

        {/* ---------- Leaderboard ---------- */}
        <div className="mt-12">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-redline" />
            <h2 className="font-display text-xl font-semibold">Leaderboard — most secure first</h2>
          </div>
          <div className="space-y-3">
            {ranked.map((s, i) => (
              <SubjectRow key={s.id} subject={s} rank={i + 1} />
            ))}
          </div>

          {/* Real audits that opted into the benchmark (local to this device). */}
          <YourAudits />
        </div>

        {/* ---------- Takeaway + methodology ---------- */}
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="panel grain relative overflow-hidden p-6">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(600px_circle_at_20%_0%,rgba(255,59,59,0.08),transparent_60%)]" />
            <p className="mono-label mb-2 flex items-center gap-2">
              <ShieldAlert className="h-3.5 w-3.5 text-redline" /> The takeaway
            </p>
            <p className="text-sm leading-relaxed text-chalk-dim">
              Security isn&apos;t a property of the model — it&apos;s a property of how the bot is
              built. The same base model goes from{" "}
              <span className="font-mono text-redline">F</span> to{" "}
              <span className="font-mono text-safe">A</span> once the right guardrails are in place.
              The gap between a bare wrapper and a Redline-hardened bot is the entire product:
              find the breaks, close them, prove they&apos;re closed — on every deploy.
            </p>
            <Link href="/audit" className="mt-5 inline-block">
              <Button size="sm" className="group">
                Audit your bot against this battery
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
          <div className="panel p-6">
            <p className="mono-label mb-2">Methodology</p>
            <ul className="space-y-2 text-sm leading-relaxed text-chalk-dim">
              <li>
                Each archetype was reconstructed as several system-prompt variants reflecting how the
                pattern is shipped in the wild.
              </li>
              <li>
                Every variant was run through the same {Object.keys(categoryMap).length}-category
                Redline battery; a separate low-temperature judge scored each response.
              </li>
              <li>
                Scores are 0–100 risk (higher = worse), graded A–F. Aggregate percentages are
                weighted by the number of variants per archetype.
              </li>
              <li>
                We benchmark <span className="text-chalk">build patterns, not named vendors</span> —
                the failure modes generalise, and it keeps the findings honest.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}

function BigStat({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone: "red" | "safe";
}) {
  return (
    <div className="panel p-5">
      <p
        className={cn(
          "font-display text-4xl font-bold tabular-nums",
          tone === "red" ? "text-redline" : "text-safe",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-chalk-dim">{label}</p>
    </div>
  );
}

const GRADE_TONE: Record<Grade, string> = {
  A: "border-safe/40 bg-safe/10 text-safe",
  B: "border-safe/40 bg-safe/10 text-safe",
  C: "border-warn/40 bg-warn/10 text-warn",
  D: "border-redline/40 bg-redline/10 text-redline",
  F: "border-redline/50 bg-redline/15 text-redline-bright",
};

function SubjectRow({ subject, rank }: { subject: BenchmarkSubject; rank: number }) {
  const grade = gradeFor(subject.score);
  const scoreColor =
    subject.score < 35 ? "text-safe" : subject.score < 55 ? "text-warn" : "text-redline";

  return (
    <div className="panel grid items-center gap-4 p-5 sm:grid-cols-[auto_1fr_auto_auto]">
      {/* Grade */}
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-md border font-display text-2xl font-bold",
          GRADE_TONE[grade],
        )}
      >
        {grade}
      </div>

      {/* Identity */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] text-chalk-faint">#{rank}</span>
          <p className="font-medium text-chalk">{subject.name}</p>
          <Badge variant="neutral">{subject.prevalence}</Badge>
        </div>
        <p className="mt-1 text-sm text-chalk-dim">{subject.pattern}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {subject.brokeOn.length === 0 ? (
            <span className="inline-flex items-center rounded border border-safe/30 bg-safe/[0.08] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-safe">
              held the full battery
            </span>
          ) : (
            subject.brokeOn.map((c) => (
              <span
                key={c}
                className="inline-flex items-center rounded border border-redline/30 bg-redline/[0.06] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-redline-bright"
              >
                {categoryMap[c].short}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Score */}
      <div className="text-right">
        <p className={cn("font-display text-3xl font-bold tabular-nums", scoreColor)}>
          {subject.score}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-chalk-faint">risk / 100</p>
      </div>

      {/* Sample */}
      <div className="text-right">
        <p className="font-mono text-xs text-chalk-dim">{subject.sampleSize}</p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-chalk-faint">variants</p>
      </div>
    </div>
  );
}
