"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Trash2, UserCheck } from "lucide-react";
import {
  readSubmissions,
  clearSubmissions,
  type BenchmarkSubmission,
} from "@/lib/benchmark-submissions";
import { gradeFor, type Grade } from "@/lib/benchmark";
import { categoryMap } from "@/lib/attacks";
import { cn } from "@/lib/utils";

const GRADE_TONE: Record<Grade, string> = {
  A: "border-safe/40 bg-safe/10 text-safe",
  B: "border-safe/40 bg-safe/10 text-safe",
  C: "border-warn/40 bg-warn/10 text-warn",
  D: "border-redline/40 bg-redline/10 text-redline",
  F: "border-redline/50 bg-redline/15 text-redline-bright",
};

export function YourAudits() {
  // Hydrate from localStorage after mount (avoids SSR mismatch).
  const [subs, setSubs] = useState<BenchmarkSubmission[] | null>(null);
  useEffect(() => setSubs(readSubmissions()), []);

  if (subs === null) return null; // not hydrated yet

  return (
    <div className="mt-12">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-redline" />
          <h2 className="font-display text-xl font-semibold">Your audits</h2>
          <span className="font-mono text-xs text-chalk-faint">· this device</span>
        </div>
        {subs.length > 0 ? (
          <button
            onClick={() => {
              clearSubmissions();
              setSubs([]);
            }}
            className="inline-flex items-center gap-1.5 font-mono text-xs text-chalk-faint transition-colors hover:text-redline"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
        ) : null}
      </div>

      {subs.length === 0 ? (
        <div className="panel grain relative overflow-hidden p-6">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(600px_circle_at_20%_0%,rgba(255,59,59,0.06),transparent_60%)]" />
          <p className="text-sm leading-relaxed text-chalk-dim">
            The numbers above are a seeded study of common build patterns. Audit your own bot — paste
            its prompt, point at a GitHub repo, or give an endpoint — and add the result here to see
            where it lands against the field.
          </p>
          <Link href="/audit/new" className="mt-4 inline-flex">
            <span className="group inline-flex items-center gap-2 rounded-full border border-redline/40 bg-redline/10 px-4 py-2 text-sm font-medium text-redline-bright transition-colors hover:bg-redline/20">
              Audit your bot
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {subs.map((s) => (
            <SubmissionRow key={s.id} sub={s} />
          ))}
          <p className="px-1 text-xs leading-relaxed text-chalk-faint">
            Stored locally on this device. In production these would feed a shared, growing
            leaderboard — the dataset that makes the benchmark a moat.
          </p>
        </div>
      )}
    </div>
  );
}

function SubmissionRow({ sub }: { sub: BenchmarkSubmission }) {
  const grade = gradeFor(sub.score);
  const scoreColor = sub.score < 35 ? "text-safe" : sub.score < 55 ? "text-warn" : "text-redline";
  const sourceLabel = sub.source?.startsWith("github")
    ? sub.source.replace(/^github:/, "")
    : sub.source === "http"
      ? "HTTP endpoint"
      : "pasted prompt";

  return (
    <div className="panel grid items-center gap-4 p-5 sm:grid-cols-[auto_1fr_auto]">
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-md border font-display text-2xl font-bold",
          GRADE_TONE[grade],
        )}
      >
        {grade}
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium text-chalk">{sub.name}</p>
        <p className="mt-0.5 truncate font-mono text-[11px] text-chalk-faint">
          {sourceLabel} · {sub.date.slice(0, 10)}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {sub.brokeOn.length === 0 ? (
            <span className="inline-flex items-center rounded border border-safe/30 bg-safe/[0.08] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-safe">
              held the full battery
            </span>
          ) : (
            sub.brokeOn.map((c) => (
              <span
                key={c}
                className="inline-flex items-center rounded border border-redline/30 bg-redline/[0.06] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-redline-bright"
              >
                {categoryMap[c]?.short ?? c}
              </span>
            ))
          )}
        </div>
      </div>
      <div className="text-right">
        <p className={cn("font-display text-3xl font-bold tabular-nums", scoreColor)}>{sub.score}</p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-chalk-faint">risk / 100</p>
      </div>
    </div>
  );
}
