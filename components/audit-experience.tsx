"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import type { AuditSummary } from "@/lib/types";
import { useAudit, type AuditState, type AuditRunConfig } from "./use-audit";
import { AuditConsole } from "./audit-console";
import { ReportView } from "./report-view";
import { Wordmark } from "./brand";
import { Badge } from "./ui/badge";
import { bandMeta } from "@/lib/utils";

type View = "console" | "report" | "reaudit";

export function AuditExperience({
  run,
  title,
  subtitle,
  allowProve = false,
}: {
  run: AuditRunConfig;
  title: string;
  subtitle?: string;
  allowProve?: boolean;
}) {
  const { state, start } = useAudit(run);
  const [view, setView] = useState<View>("console");
  // Snapshot of the original (vulnerable) run — preserved so the report stays
  // stable even while the hardened re-audit overwrites the live state.
  const [baseline, setBaseline] = useState<AuditState | null>(null);
  const [proof, setProof] = useState<AuditSummary | null>(null);
  const reportTop = useRef<HTMLDivElement>(null);

  // Kick off the initial audit on mount.
  useEffect(() => {
    void start();
  }, [start]);

  // Capture the baseline once the first (non-hardened) run completes.
  useEffect(() => {
    if (state.phase === "done" && !state.hardened && !baseline) setBaseline(state);
  }, [state, baseline]);

  // Record the hardened result once the re-audit completes.
  useEffect(() => {
    if (state.phase === "done" && state.hardened && state.summary) setProof(state.summary);
  }, [state]);

  const goReport = () => {
    setView("report");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const proveTheFix = () => {
    setProof(null);
    setView("reaudit");
    window.scrollTo({ top: 0, behavior: "smooth" });
    void start(true);
  };

  const label =
    view === "report" ? "Findings report" : view === "reaudit" ? "Proof · patched re-audit" : "Live audit console";

  return (
    <main className="relative min-h-screen">
      <div className="absolute inset-0 -z-10 bg-grid bg-grid-fade opacity-[0.15]" />

      <div className="sticky top-0 z-40 border-b border-border/60 bg-ink/70 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-3">
            <Badge variant={state.mode === "live" ? "safe" : "warn"}>
              {state.mode === "live" ? "Live mode" : "Demo mode"}
            </Badge>
            <Link
              href="/audit"
              className="inline-flex items-center gap-1.5 text-sm text-chalk-faint transition-colors hover:text-chalk"
            >
              <ArrowLeft className="h-4 w-4" /> Targets
            </Link>
          </div>
        </div>
      </div>

      <div ref={reportTop} className="container py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mono-label mb-1.5">{label}</p>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {title} {subtitle ? <span className="text-chalk-faint">· {subtitle}</span> : null}
            </h1>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {view === "console" ? (
            <motion.div key="console" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
              <AuditConsole targetName={title} state={state} onViewReport={goReport} />
            </motion.div>
          ) : view === "report" ? (
            <motion.div key="report" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
              <ReportView
                targetName={title}
                state={baseline ?? state}
                proof={proof}
                onProve={allowProve ? proveTheFix : undefined}
                endpoint={run.target?.endpoint}
                adaptiveBotId={run.botId}
              />
            </motion.div>
          ) : (
            <motion.div key="reaudit" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
              <ProofHeader baseline={baseline?.summary ?? null} state={state} />
              <AuditConsole
                targetName={title}
                state={state}
                hardened
                doneLabel="Back to report"
                onViewReport={goReport}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {state.phase === "error" ? (
          <div className="mt-6 rounded-md border border-redline/40 bg-redline/[0.06] p-4 text-sm text-redline-bright">
            Audit failed: {state.error}. If you&apos;re on the live path, check LLM_API_KEY — or set
            DEMO_MODE=true.
          </div>
        ) : null}
      </div>
    </main>
  );
}

/** The before → after risk comparison shown above the patched re-audit. */
function ProofHeader({ baseline, state }: { baseline: AuditSummary | null; state: AuditState }) {
  const before = baseline?.score ?? 100;
  const after = state.liveScore;
  const done = state.phase === "done";
  const delta = Math.max(0, before - after);

  return (
    <div className="panel mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="flex items-center gap-5">
        <Metric label="Before" value={before} tone="red" sub={baseline ? bandMeta[baseline.band].label : "Critical"} />
        <ArrowRight className="h-5 w-5 text-chalk-faint" />
        <Metric
          label="After patch"
          value={after}
          tone={done ? "safe" : "neutral"}
          sub={done && state.summary ? bandMeta[state.summary.band].label : "auditing…"}
        />
      </div>
      <div className="flex items-center gap-2 text-sm">
        {done ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-safe/40 bg-safe/10 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-safe">
            <ShieldCheck className="h-4 w-4" /> −{delta} risk eliminated
          </span>
        ) : (
          <span className="font-mono text-xs text-chalk-faint">
            re-running the same {state.total || 18} attacks with patches applied…
          </span>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: number;
  tone: "red" | "safe" | "neutral";
  sub: string;
}) {
  const color = tone === "red" ? "text-redline" : tone === "safe" ? "text-safe" : "text-chalk-dim";
  return (
    <div>
      <p className="mono-label">{label}</p>
      <p className={`font-display text-3xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="font-mono text-[11px] uppercase tracking-wider text-chalk-faint">{sub}</p>
    </div>
  );
}
