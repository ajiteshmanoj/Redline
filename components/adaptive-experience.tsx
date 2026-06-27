"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  Crosshair,
  Download,
  Fingerprint,
  ShieldAlert,
  ShieldCheck,
  Scale,
  Swords,
} from "lucide-react";
import type {
  AdaptiveCampaign,
  AdaptiveSummary,
  AdaptiveTurn,
  AttackCategoryId,
  TargetProfile,
} from "@/lib/types";
import { useAdaptive, type AdaptiveRunConfig } from "./use-adaptive";
import { summarizeAdaptive } from "@/lib/adaptive";
import { categoryVisual } from "./category-meta";
import { categoryMap } from "@/lib/attacks";
import { SeverityMeter } from "./severity-meter";
import { aggregateExposure, formatSGD } from "@/lib/exposure";
import { OWASP_LABEL, MAS_FULL, NON_AFFILIATION } from "@/lib/standards";
import { ModeBadge } from "./mode-badge";
import { RunRoster } from "./run-roster";
import { Wordmark } from "./brand";
import { Button } from "./ui/button";
import { Typewriter } from "./fx/typewriter";
import { bandMeta } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function AdaptiveExperience({
  title,
  botId,
  target,
  prompt,
  financial = false,
}: {
  title: string;
  // Financial institution → MAS proposed guidelines are in scope (FIs only).
  financial?: boolean;
} & AdaptiveRunConfig) {
  const { state, start } = useAdaptive({ botId, target, prompt });

  useEffect(() => {
    void start();
  }, [start]);

  const running = state.phase === "running";
  // Live score from campaigns completed so far (same scoring as the report).
  const liveScore = state.summary
    ? state.summary.score
    : summarizeAdaptive(botId ?? "custom", state.campaigns).score;
  const brokenCount = state.summary
    ? state.summary.broken
    : state.campaigns.filter((c) => c.broken).length;

  // Live business exposure — same model as the static report, fed by the goals
  // the agent has achieved so far (each broken campaign carries category + sev).
  const exposure = aggregateExposure(
    state.campaigns
      .filter((c) => c.broken)
      .map((c) => ({ category: c.category, severity: c.severity, title: c.title })),
  );

  // Smooth auto-scroll: follow the action as the agent streams new turns. We
  // disengage only on a genuine user scroll-UP intent (wheel up / PageUp / Home
  // / touch), and re-engage once they scroll back near the bottom. Using intent
  // (not scroll position) avoids a feedback deadlock where the programmatic
  // smooth-scroll's own mid-animation frames would read as "user scrolled away".
  const feedEndRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);
  const turnsRendered =
    state.liveTurns.length + state.campaigns.reduce((acc, c) => acc + c.turns.length, 0);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) followRef.current = false; // user pulled up to read
    };
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowUp", "PageUp", "Home"].includes(e.key)) followRef.current = false;
    };
    const onTouch = () => {
      followRef.current = false;
    };
    const onScroll = () => {
      // Re-engage when the user returns near the bottom.
      const fromBottom =
        document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
      if (fromBottom < 120) followRef.current = true;
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (state.phase !== "running" || !followRef.current) return;
    feedEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turnsRendered, state.recon, state.current?.goalId, state.phase]);

  return (
    <main className="relative min-h-screen">
      <div className="absolute inset-0 -z-10 bg-grid bg-grid-fade opacity-[0.15]" />

      <div className="sticky top-0 z-40 border-b border-border/60 bg-ink/70 backdrop-blur-xl print:hidden">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-3">
            <ModeBadge mode={state.mode} model={state.model} running={running} />
            <Link
              href="/audit"
              className="inline-flex items-center gap-1.5 text-sm text-chalk-faint transition-colors hover:text-chalk"
            >
              <ArrowLeft className="h-4 w-4" /> Targets
            </Link>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 print:hidden">
          <div>
            <p className="mono-label mb-1.5 flex items-center gap-2">
              <Swords className="h-3.5 w-3.5 text-redline" /> Adaptive agent · multi-turn red-team
            </p>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {title} <span className="text-chalk-faint">· adaptive engagement</span>
            </h1>
          </div>
          {state.phase === "done" ? (
            <div className="flex gap-2 print:hidden">
              <Button variant="secondary" size="sm" onClick={() => window.print()}>
                <Download className="h-4 w-4" /> Export PDF
              </Button>
            </div>
          ) : null}
        </div>

        {/* Concise, print-only report (the on-screen feed is too long for PDF). */}
        {state.summary ? (
          <AdaptivePrintReport
            title={title}
            summary={state.summary}
            campaigns={state.campaigns}
            financial={financial}
          />
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_320px] print:hidden">
          {/* ---------------- Engagement feed ---------------- */}
          <div className="panel grain relative order-2 flex flex-col gap-4 p-5 lg:order-1">
            <div className="-mx-5 -mt-5 mb-1 flex items-center justify-between border-b border-border px-5 py-3">
              <div className="flex items-center gap-2.5">
                <Crosshair className={cn("h-4 w-4 text-redline", running && "animate-spin-slow")} />
                <span className="font-mono text-sm text-chalk">
                  agent vs <span className="text-redline-bright">{title}</span>
                </span>
              </div>
              <span className="flex items-center gap-2 font-mono text-xs text-chalk-faint">
                {running ? (
                  <>
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-redline" /> engaging
                  </>
                ) : (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-safe" /> complete
                  </>
                )}
              </span>
            </div>

            {state.recon ? <ReconCard recon={state.recon} /> : null}

            {state.campaigns
              .filter((c) => c.turns.length > 0)
              .map((c) => (
                <CampaignBlock key={c.goalId} campaign={c} />
              ))}

            {/* in-progress campaign */}
            {state.current ? (
              <LiveCampaign
                title={state.current.title}
                objective={state.current.objective}
                category={state.current.category}
                turns={state.liveTurns}
                running={running}
              />
            ) : null}

            {state.phase === "idle" ? (
              <div className="flex h-40 items-center justify-center text-sm text-chalk-faint">
                Briefing the adaptive agent…
              </div>
            ) : null}

            {state.phase === "error" ? (
              <div className="rounded-md border border-redline/40 bg-redline/[0.06] p-4 text-sm text-redline-bright">
                Adaptive run failed: {state.error}. The agent needs the live LLM path — set
                LLM_API_KEY, or run a bot with a captured demo fixture.
              </div>
            ) : null}

            {/* Auto-scroll anchor — kept in view while the agent streams. */}
            <div ref={feedEndRef} aria-hidden className="h-0 scroll-mt-24" />
          </div>

          {/* ---------------- Telemetry ---------------- */}
          <div className="order-1 space-y-6 lg:sticky lg:top-6 lg:order-2 lg:self-start print:hidden">
            <div className="panel flex flex-col items-center gap-1 p-6">
              <SeverityMeter value={liveScore} live={running} />
              <div className="mt-4 grid w-full grid-cols-2 gap-3">
                <Stat label="Broken" value={brokenCount} tone="red" />
                <Stat label="Resisted" value={state.campaigns.length - brokenCount} tone="safe" />
              </div>
              <div className="mt-3 w-full">
                <div className="mb-1 flex justify-between font-mono text-[11px] text-chalk-faint">
                  <span>campaigns</span>
                  <span>
                    {state.campaigns.length}/{state.totalGoals || 5}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    className="h-full rounded-full bg-redline"
                    animate={{
                      width: `${((state.campaigns.length / (state.totalGoals || 5)) * 100).toFixed(1)}%`,
                    }}
                    transition={{ ease: "easeOut", duration: 0.5 }}
                  />
                </div>
              </div>
            </div>

            {exposure.totalSGD > 0 ? (
              <div className="panel grain relative overflow-hidden border-redline/30 p-5">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(420px_circle_at_80%_0%,rgba(255,59,59,0.10),transparent_60%)]" />
                <p className="mono-label mb-2 flex items-center gap-2">
                  <Banknote className="h-3.5 w-3.5 text-redline" /> Estimated exposure
                </p>
                <p className="font-display text-3xl font-bold leading-none tracking-tight text-redline">
                  {formatSGD(exposure.totalSGD)}
                </p>
                <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-chalk-faint">
                  range {formatSGD(exposure.rangeSGD[0])} – {formatSGD(exposure.rangeSGD[1])}
                </p>
                <p className="mt-2.5 text-xs leading-relaxed text-chalk-dim">
                  From the {brokenCount} goal{brokenCount === 1 ? "" : "s"} the agent has achieved —
                  Singapore-anchored, severity-scaled. Indicative, not a precise figure.
                </p>
              </div>
            ) : null}

            <div className="panel p-5">
              <p className="mono-label mb-3">AI in this run</p>
              <RunRoster models={state.models} mode={state.mode} />
            </div>

            <div className="panel p-5">
              <p className="mono-label mb-3">How this differs</p>
              <p className="text-sm leading-relaxed text-chalk-dim">
                The static battery fires one fixed prompt per probe. This agent pursues a{" "}
                <span className="text-chalk">goal</span> over up to {state.maxTurns} turns, reading
                each reply and escalating — catching breaks that only appear under sustained,
                adaptive pressure.
              </p>
            </div>

            {state.summary ? (
              <div
                className={cn(
                  "panel p-5",
                  brokenCount > 0 ? "border-redline/30" : "border-safe/30",
                )}
              >
                <p className="mono-label mb-2">Verdict</p>
                <p className="text-sm leading-relaxed text-chalk-dim">{state.summary.headline}</p>
                {state.summary.avgTurnsToBreak ? (
                  <p className="mt-2 font-mono text-xs text-chalk-faint">
                    avg turns to break: {state.summary.avgTurnsToBreak}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

/* ----------------------- concise print-only report ----------------------- */

function AdaptivePrintReport({
  title,
  summary,
  campaigns,
  financial,
}: {
  title: string;
  summary: AdaptiveSummary;
  campaigns: AdaptiveCampaign[];
  financial: boolean;
}) {
  // Only campaigns that actually ran (a 0-turn campaign never engaged).
  const ran = campaigns.filter((c) => c.turns.length > 0);
  const broken = ran.filter((c) => c.broken);
  const exposure = aggregateExposure(
    broken.map((c) => ({ category: c.category, severity: c.severity, title: c.title })),
  );
  // MAS named risk only for financial institutions (FIs); OWASP always.
  const tag = (c: AdaptiveCampaign) => {
    const m = categoryMap[c.category];
    return financial && m.masRisk ? `${m.owaspId} · MAS: ${m.masRisk}` : m.owaspId;
  };

  return (
    <div className="hidden print:block">
      <p className="mono-label">Adaptive red-team report · multi-turn agent</p>
      <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-3 font-display text-lg font-bold">
        Risk {summary.score}/100 · {bandMeta[summary.band].label}
      </p>
      <p className="text-sm text-chalk-dim">
        {summary.broken} of {summary.totalGoals} goals achieved by the agent · {summary.resisted}{" "}
        resisted
        {summary.avgTurnsToBreak ? ` · avg ${summary.avgTurnsToBreak} turns to break` : ""}
      </p>
      {exposure.totalSGD > 0 ? (
        <p className="mt-1 text-sm font-semibold text-redline">
          Estimated exposure: {formatSGD(exposure.totalSGD)}{" "}
          <span className="font-normal text-chalk-faint">
            (range {formatSGD(exposure.rangeSGD[0])} – {formatSGD(exposure.rangeSGD[1])}; indicative)
          </span>
        </p>
      ) : null}
      <p className="mt-2 max-w-3xl text-sm text-chalk-dim">{summary.headline}</p>

      <h2 className="mb-2 mt-6 font-display text-base font-semibold">
        Campaigns ({ran.length})
      </h2>
      <div>
        {ran.map((c) => (
          <div
            key={c.goalId}
            className="flex items-baseline justify-between gap-4 border-b border-border py-1.5 text-sm"
          >
            <span className="text-chalk">
              {c.title} <span className="font-mono text-[11px] text-chalk-faint">· {tag(c)}</span>
            </span>
            <span
              className={cn(
                "shrink-0 font-mono text-xs",
                c.broken ? "text-redline-bright" : "text-safe",
              )}
            >
              {c.broken
                ? `BROKEN · ${c.turnsUsed} turn${c.turnsUsed === 1 ? "" : "s"} · sev ${c.severity}`
                : `resisted · ${c.turnsUsed} turns`}
            </span>
          </div>
        ))}
      </div>

      {broken.length > 0 ? (
        <>
          <h2 className="mb-2 mt-6 font-display text-base font-semibold">
            Confirmed breaks ({broken.length}) — proof
          </h2>
          <div className="space-y-3">
            {broken.map((c) => {
              const t = c.turns[c.turns.length - 1];
              return (
                <div key={c.goalId} className="rounded-md border border-redline/30 p-3">
                  <p className="font-medium text-chalk">
                    {c.title}{" "}
                    <span className="font-mono text-[11px] text-chalk-faint">
                      · {tag(c)} · broke on turn {t.index + 1}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-redline-bright">{t.verdict.reason}</p>
                  <p className="mt-2 text-xs text-chalk-dim">
                    <span className="font-semibold text-redline/80">Agent:</span> {t.attacker}
                  </p>
                  <p className="mt-1 text-xs text-chalk">
                    <span className="font-semibold text-redline-bright">Bot:</span> {t.bot}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p className="mt-6 text-sm text-safe">
          No goals achieved — the bot resisted all multi-turn campaigns.
        </p>
      )}

      <p className="mt-6 text-xs text-chalk-faint">
        Generated by Redline · adaptive multi-turn agent. Findings map to the {OWASP_LABEL}
        {financial ? <>, and to the {MAS_FULL} (proposed, in consultation)</> : null}. {NON_AFFILIATION}
      </p>
    </div>
  );
}

/* ---------------------------- campaign blocks ---------------------------- */

function ReconCard({ recon }: { recon: TargetProfile }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="overflow-hidden rounded-lg border border-redline/30 bg-redline/[0.03]"
    >
      <div className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3">
        <Fingerprint className="h-4 w-4 text-redline" />
        <p className="font-medium text-chalk">Target profiled</p>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-chalk-faint">
          recon
        </span>
      </div>
      <div className="space-y-3 px-4 py-4">
        <div className="space-y-1.5 font-mono text-xs leading-relaxed">
          <p>
            <span className="font-semibold text-redline/70">atk ▸</span>{" "}
            <span className="text-chalk-dim">{recon.probe}</span>
          </p>
          <p>
            <span className="font-semibold text-safe">bot ◂</span>{" "}
            <span className="text-chalk-dim">{recon.reply}</span>
          </p>
        </div>
        <div className="rounded-md bg-black/[0.03] px-3 py-2">
          <p className="mono-label mb-1">Inferred attack surface</p>
          <p className="text-sm text-chalk">{recon.summary}</p>
        </div>
        <p className="text-xs text-chalk-faint">
          The agent now tailors every attack to this profile.
        </p>
      </div>
    </motion.div>
  );
}

function CampaignBlock({ campaign }: { campaign: AdaptiveCampaign }) {
  // The turn the bot actually broke on (the agent stops escalating once it lands).
  const breakTurn = campaign.turns.find((t) => t.verdict.broken)?.index;
  return (
    <CampaignShell
      title={campaign.title}
      objective={campaign.objective}
      category={campaign.category}
      verdict={
        campaign.broken ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-redline px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white shadow-[0_0_18px_-2px_rgba(255,59,59,0.7)]">
            <ShieldAlert className="h-3.5 w-3.5" /> Broke on turn{" "}
            {breakTurn != null ? breakTurn + 1 : campaign.turnsUsed} · sev {campaign.severity}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-safe/40 bg-safe/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-safe">
            <ShieldCheck className="h-3.5 w-3.5" /> Resisted · {campaign.turnsUsed} turns
          </span>
        )
      }
    >
      {campaign.turns.map((t) => (
        <TurnView key={t.index} turn={t} />
      ))}
    </CampaignShell>
  );
}

function LiveCampaign({
  title,
  objective,
  category,
  turns,
  running,
}: {
  title: string;
  objective: string;
  category: AttackCategoryId;
  turns: AdaptiveTurn[];
  running: boolean;
}) {
  return (
    <CampaignShell
      title={title}
      objective={objective}
      category={category}
      verdict={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-redline/40 bg-redline/[0.08] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-redline-bright">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-redline opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-redline" />
          </span>
          engaging
        </span>
      }
      live
    >
      {turns.map((t, i) => (
        <TurnView key={t.index} turn={t} typeLast={running && i === turns.length - 1} />
      ))}
      {running ? (
        <p className="pl-1 font-mono text-xs text-chalk-faint">
          agent composing next move<span className="animate-pulse">▋</span>
        </p>
      ) : null}
    </CampaignShell>
  );
}

function CampaignShell({
  title,
  objective,
  category,
  verdict,
  children,
  live,
}: {
  title: string;
  objective: string;
  category: AttackCategoryId;
  verdict: React.ReactNode;
  children: React.ReactNode;
  live?: boolean;
}) {
  const Icon = categoryVisual[category].icon;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "overflow-hidden rounded-lg border",
        live ? "border-redline/40 bg-redline/[0.03]" : "border-border bg-white/[0.015]",
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-redline" />
          <div className="min-w-0">
            <p className="font-medium leading-tight text-chalk">{title}</p>
            <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wider text-chalk-faint">
              {categoryMap[category].label}
            </p>
            <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-chalk-dim">{objective}</p>
          </div>
        </div>
        <div className="shrink-0">{verdict}</div>
      </div>
      <div className="space-y-3 px-4 py-4">{children}</div>
    </motion.div>
  );
}

function TurnView({ turn, typeLast }: { turn: AdaptiveTurn; typeLast?: boolean }) {
  const broke = turn.verdict.broken;
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm border border-redline/30 bg-redline/[0.07] px-3.5 py-2 text-sm text-chalk">
          <span className="mb-0.5 block font-mono text-[10px] uppercase tracking-wider text-redline/80">
            agent · turn {turn.index + 1}
          </span>
          {turn.attacker}
        </div>
      </div>
      <div className="flex justify-start">
        <div
          className={cn(
            "max-w-[85%] rounded-2xl rounded-bl-sm border px-3.5 py-2 text-sm",
            broke
              ? "border-redline/50 bg-redline/[0.10] text-chalk shadow-[0_0_0_1px_rgba(255,59,59,0.15)]"
              : "border-border bg-white/[0.02] text-chalk-dim",
          )}
        >
          <span
            className={cn(
              "mb-0.5 block font-mono text-[10px] uppercase tracking-wider",
              broke ? "text-redline-bright" : "text-safe",
            )}
          >
            bot
          </span>
          {typeLast ? <Typewriter text={turn.bot} /> : turn.bot}
        </div>
      </div>
      {/* per-turn verdict from the separate LLM judge — shown every turn */}
      <p
        className={cn(
          "flex items-start gap-1.5 rounded-md px-3 py-1.5 text-[11px]",
          broke ? "bg-redline/10 text-redline-bright" : "text-chalk-faint",
        )}
      >
        <Scale className="mt-px h-3.5 w-3.5 shrink-0" />
        <span>
          <span className="font-semibold uppercase tracking-wider">judge</span> ·{" "}
          {turn.verdict.reason}
        </span>
      </p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "red" | "safe" }) {
  return (
    <div className="rounded-md border border-border bg-white/[0.02] px-3 py-2.5 text-center">
      <p
        className={cn(
          "font-display text-2xl font-bold tabular-nums",
          tone === "red" ? "text-redline" : "text-safe",
        )}
      >
        {value}
      </p>
      <p className="mono-label mt-0.5">{label}</p>
    </div>
  );
}
