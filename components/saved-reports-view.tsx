"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Trash2, FileText, ShieldAlert } from "lucide-react";
import { listReports, removeReport, type SavedReport } from "@/lib/saved-reports";
import type { AuditState } from "./use-audit";
import { ReportView } from "./report-view";
import { bandMeta } from "@/lib/utils";
import { cn } from "@/lib/utils";

function toState(r: SavedReport): AuditState {
  return {
    phase: "done",
    mode: "live",
    model: null,
    models: null,
    hardened: false,
    results: r.results,
    current: null,
    liveScore: r.summary.score,
    completed: r.results.length,
    total: r.results.length,
    summary: r.summary,
    vulnerabilities: r.vulnerabilities,
    patches: r.patches,
    error: null,
  };
}

export function SavedReportsView() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => setReports(listReports()), []);

  const refresh = () => setReports(listReports());
  const del = (id: string) => {
    removeReport(id);
    if (openId === id) setOpenId(null);
    refresh();
  };

  const open = openId ? reports.find((r) => r.id === openId) : null;

  if (open) {
    return (
      <div>
        <button
          onClick={() => setOpenId(null)}
          className="mb-6 inline-flex items-center gap-2 text-sm text-chalk-faint transition-colors hover:text-chalk"
        >
          <ArrowLeft className="h-4 w-4" /> All saved reports
        </button>
        <ReportView targetName={open.targetName} state={toState(open)} endpoint={open.endpoint} />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="panel flex flex-col items-center gap-3 p-12 text-center">
        <FileText className="h-8 w-8 text-chalk-faint" />
        <p className="text-chalk-dim">No saved reports yet.</p>
        <p className="max-w-sm text-sm text-chalk-faint">
          Run an audit, then hit <span className="text-chalk">Save report</span> on the findings page.
          Saved reports live on this device only.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((r, i) => {
        const band = bandMeta[r.summary.band];
        const tone = band.tone;
        const color = tone === "red" ? "text-redline" : tone === "warn" ? "text-warn" : "text-safe";
        return (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="panel flex items-center gap-4 p-4 transition-colors hover:border-white/15"
          >
            <span className={cn("font-display text-2xl font-bold tabular-nums", color)}>
              {r.summary.score}
            </span>
            <div className="h-10 w-px bg-border" />
            <button onClick={() => setOpenId(r.id)} className="min-w-0 flex-1 text-left">
              <p className="truncate font-medium text-chalk">{r.targetName}</p>
              <p className="font-mono text-[11px] text-chalk-faint">
                {new Date(r.savedAt).toLocaleString()} · {band.label} ·{" "}
                {r.summary.broken > 0 ? (
                  <span className="text-redline-bright">{r.summary.broken} break{r.summary.broken === 1 ? "" : "s"}</span>
                ) : (
                  <span className="text-safe">held</span>
                )}
              </p>
            </button>
            {r.summary.broken > 0 ? <ShieldAlert className="h-4 w-4 shrink-0 text-redline" /> : null}
            <button
              onClick={() => del(r.id)}
              className="shrink-0 rounded-md border border-border p-2 text-chalk-faint transition-colors hover:border-redline/40 hover:text-redline"
              aria-label="Delete report"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
