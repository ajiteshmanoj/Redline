"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ShieldAlert, ShieldCheck, Crosshair, AlertTriangle, Scale } from "lucide-react";
import type { AttackResult } from "@/lib/types";
import { ATTACKS, CATEGORIES, categoryMap } from "@/lib/attacks";
import { isTransportError } from "@/lib/audit";
import { categoryVisual } from "./category-meta";
import { ModeBadge } from "./mode-badge";
import { RunRoster } from "./run-roster";
import { SeverityMeter } from "./severity-meter";
import { cn } from "@/lib/utils";
import type { AuditState } from "./use-audit";
import { Typewriter } from "./fx/typewriter";
import { ConsoleBackdrop } from "./fx/console-backdrop";

export function AuditConsole({
  targetName,
  state,
  onViewReport,
  hardened = false,
  doneLabel = "View report",
}: {
  targetName: string;
  state: AuditState;
  onViewReport: () => void;
  hardened?: boolean;
  doneLabel?: string;
}) {
  const feedRef = useRef<HTMLDivElement>(null);
  // One-shot red flash when a breaking verdict run lands.
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (state.phase === "done" && state.summary && state.summary.broken > 0) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1000);
      return () => clearTimeout(t);
    }
  }, [state.phase, state.summary]);

  // Auto-scroll the feed as results stream in.
  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [state.results.length, state.current]);

  const counts = useMemo(() => computeCounts(state.results), [state.results]);
  const erroredCount = state.results.filter((r) => isTransportError(r)).length;
  const brokenCount = state.results.filter(
    (r) => r.verdict.broken && !isTransportError(r),
  ).length;
  const running = state.phase === "running";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      {/* ---------------- Live attack feed ---------------- */}
      <div className="panel grain relative order-2 flex max-h-[72vh] min-h-[60vh] flex-col overflow-hidden lg:order-1">
        <ConsoleBackdrop active={running} />
        {/* one-shot climax flash */}
        <AnimatePresence>
          {flash ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.5, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, times: [0, 0.15, 1] }}
              className="pointer-events-none absolute inset-0 z-40 bg-redline/40 mix-blend-screen"
            />
          ) : null}
        </AnimatePresence>
        <div className="relative z-10 flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Crosshair className={cn("h-4 w-4 text-redline", running && "animate-spin-slow")} />
            <span className="font-mono text-sm text-chalk">
              {hardened ? "re-auditing" : "attacking"}{" "}
              <span className="text-redline-bright">{targetName}</span>
              {hardened ? <span className="text-safe"> · patched</span> : null}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <ModeBadge mode={state.mode} model={state.model} running={running} />
            <span className="flex items-center gap-1.5 font-mono text-xs text-chalk-faint">
              {running ? (
                <>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-redline" />
                  running
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-safe" />
                  complete
                </>
              )}
            </span>
          </div>
        </div>

        {/* scanning sweep overlay while running */}
        {running ? (
          <div className="pointer-events-none absolute inset-x-0 top-14 z-10 h-16 bg-gradient-to-b from-redline/10 to-transparent animate-scan-sweep" />
        ) : null}

        <div ref={feedRef} className="relative z-10 flex-1 space-y-3 overflow-y-auto p-5">
          <AnimatePresence initial={false}>
            {state.results.map((r, i) => (
              <FeedItem key={r.attackId} result={r} index={i} />
            ))}
          </AnimatePresence>

          {/* in-flight attack */}
          <AnimatePresence>
            {state.current ? (
              <motion.div
                key={state.current.attackId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 rounded-md border border-redline/30 bg-redline/[0.06] px-4 py-3"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-redline opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-redline" />
                </span>
                <span className="font-mono text-xs text-chalk-dim">
                  firing{" "}
                  <span className="text-chalk">{categoryMap[state.current.category].short}</span>
                  {" · "}
                  <span className="text-chalk-faint">{state.current.title}</span>
                  <span className="ml-1 animate-pulse">▋</span>
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {state.phase === "idle" ? (
            <div className="flex h-40 items-center justify-center text-sm text-chalk-faint">
              Preparing adversarial battery…
            </div>
          ) : null}
        </div>

        {/* result banner */}
        <AnimatePresence>
          {state.phase === "done" && state.summary ? (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0.15 }}
              className={cn(
                "relative z-20 flex items-center justify-between gap-4 border-t px-5 py-4",
                state.summary.broken > 0
                  ? "border-redline/40 bg-redline/[0.09]"
                  : "border-safe/40 bg-safe/[0.09]",
              )}
            >
              <div className="flex items-center gap-3">
                {state.summary.broken > 0 ? (
                  <ShieldAlert className="h-5 w-5 shrink-0 text-redline" />
                ) : (
                  <ShieldCheck className="h-5 w-5 shrink-0 text-safe" />
                )}
                <p className="text-sm font-medium text-chalk">{state.summary.headline}</p>
              </div>
              <button
                data-tour="view-report"
                onClick={onViewReport}
                className={cn(
                  "group inline-flex shrink-0 items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors",
                  state.summary.broken > 0
                    ? "bg-redline hover:bg-redline-bright"
                    : "bg-safe hover:bg-safe/90",
                )}
              >
                {doneLabel}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* ---------------- Telemetry sidebar ---------------- */}
      <div className="order-1 space-y-6 lg:order-2">
        <div className="panel flex flex-col items-center gap-1 p-6">
          <SeverityMeter value={state.liveScore} live={running} />
          <div className="mt-4 grid w-full grid-cols-2 gap-3">
            <Stat label="Breaks" value={brokenCount} tone="red" />
            <Stat label="Held" value={state.completed - brokenCount - erroredCount} tone="safe" />
          </div>
          {erroredCount > 0 ? (
            <p className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-warn/40 bg-warn/[0.06] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-warn">
              <AlertTriangle className="h-3.5 w-3.5" />
              {erroredCount} unreachable / errored
            </p>
          ) : null}
          <div className="mt-3 w-full">
            <div className="mb-1 flex justify-between font-mono text-[11px] text-chalk-faint">
              <span>progress</span>
              <span>
                {state.completed}/{state.total || ATTACKS.length}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className="h-full rounded-full bg-redline"
                animate={{
                  width: `${((state.completed / (state.total || ATTACKS.length)) * 100).toFixed(1)}%`,
                }}
                transition={{ ease: "easeOut", duration: 0.5 }}
              />
            </div>
          </div>
        </div>

        <div className="panel p-5">
          <p className="mono-label mb-3">AI in this run</p>
          <RunRoster models={state.models} mode={state.mode} />
        </div>

        <div className="panel p-5">
          <p className="mono-label mb-4">By category</p>
          <div className="space-y-3">
            {CATEGORIES.map((c) => {
              const Icon = categoryVisual[c.id].icon;
              const data = counts[c.id];
              const hasBreak = data.broken > 0;
              return (
                <div key={c.id} className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      hasBreak ? "text-redline" : "text-chalk-faint",
                    )}
                  />
                  <span className="flex-1 truncate text-sm text-chalk-dim">{c.short}</span>
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    {data.broken > 0 ? (
                      <span className="rounded bg-redline/15 px-1.5 py-0.5 text-redline-bright">
                        {data.broken} broke
                      </span>
                    ) : data.done > 0 ? (
                      <span className="rounded bg-safe/15 px-1.5 py-0.5 text-safe">held</span>
                    ) : (
                      <span className="text-chalk-faint">
                        {running ? "…" : "—"}
                      </span>
                    )}
                    <span className="w-9 text-right text-chalk-faint">
                      {data.done}/{data.total}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- feed item ------------------------------- */

function FeedItem({ result, index }: { result: AttackResult; index: number }) {
  const broken = result.verdict.broken;
  const Icon = categoryVisual[result.category].icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "overflow-hidden rounded-md border",
        broken
          ? "border-redline/40 bg-redline/[0.04] shadow-[0_0_0_1px_rgba(255,59,59,0.15)]"
          : "border-border bg-white/[0.015]",
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Icon className={cn("h-4 w-4 shrink-0", broken ? "text-redline" : "text-chalk-faint")} />
          <span className="truncate font-mono text-xs text-chalk-dim">
            <span className="text-chalk-faint">{String(index + 1).padStart(2, "0")}</span>{" "}
            {categoryMap[result.category].short} · {result.title}
          </span>
        </div>
        <motion.span
          initial={{ scale: broken ? 1.6 : 1.15, rotate: broken ? -4 : 0, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 600, damping: 18, delay: 0.12 }}
          className={cn(
            "shrink-0 rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider",
            broken ? "bg-redline text-white shadow-[0_0_18px_-2px_rgba(255,59,59,0.8)]" : "bg-safe/15 text-safe",
          )}
        >
          {broken ? `Broken · ${result.verdict.severity}` : "Safe"}
        </motion.span>
      </div>

      <div className="space-y-2.5 px-4 py-3 font-mono text-xs leading-relaxed">
        <Line role="attacker" text={result.prompt} />
        <Line role="bot" text={result.response} broken={broken} type />
        {/* The verdict comes from a separate LLM judge call — surface its reason
            for every probe, not just a SAFE/BROKEN chip. */}
        <p
          className={cn(
            "mt-1 flex items-start gap-1.5 rounded px-2.5 py-1.5 text-[11px]",
            broken ? "bg-redline/10 text-redline-bright" : "text-chalk-faint",
          )}
        >
          <Scale className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>
            <span className="font-semibold uppercase tracking-wider">judge</span> ·{" "}
            {result.verdict.reason}
          </span>
        </p>
      </div>
    </motion.div>
  );
}

function Line({
  role,
  text,
  broken,
  type,
}: {
  role: "attacker" | "bot";
  text: string;
  broken?: boolean;
  type?: boolean;
}) {
  const isAttacker = role === "attacker";
  return (
    <div className="flex gap-2.5">
      <span
        className={cn(
          "mt-0.5 shrink-0 select-none font-semibold",
          isAttacker ? "text-redline/80" : broken ? "text-redline-bright" : "text-safe",
        )}
      >
        {isAttacker ? "▸ atk" : "◂ bot"}
      </span>
      <span
        className={cn(
          "whitespace-pre-wrap break-words",
          isAttacker ? "text-chalk-dim" : broken ? "text-chalk" : "text-chalk-dim",
        )}
      >
        {type ? <Typewriter text={text} /> : text}
      </span>
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

function computeCounts(results: AttackResult[]) {
  const base: Record<string, { total: number; done: number; broken: number }> = {};
  for (const c of CATEGORIES) base[c.id] = { total: 0, done: 0, broken: 0 };
  for (const a of ATTACKS) base[a.category].total += 1;
  for (const r of results) {
    base[r.category].done += 1;
    if (r.verdict.broken) base[r.category].broken += 1;
  }
  return base;
}
