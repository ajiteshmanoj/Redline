import Link from "next/link";
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Minus,
  GitCommit,
  Webhook,
  Radar,
} from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/fx/sparkline";
import { CiSnippet } from "@/components/watch/ci-snippet";
import {
  WATCH_TARGETS,
  statusFor,
  activeAlerts,
  type WatchTarget,
  type WatchStatus,
} from "@/lib/watch";
import { bandMeta } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Redline Watch — continuous AI red-teaming",
  description: "Re-audit every deploy. Catch the regression before your customers do.",
};

export default function WatchPage() {
  const alerts = activeAlerts(WATCH_TARGETS);
  const rows = WATCH_TARGETS.map((t) => ({ target: t, status: statusFor(t) }));
  const monitored = WATCH_TARGETS.length;
  const holding = rows.filter((r) => r.status.current < 35).length;

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
            href="/benchmark"
            className="inline-flex items-center gap-2 text-sm text-chalk-faint transition-colors hover:text-chalk"
          >
            Benchmark →
          </Link>
        </div>

        {/* ---------- Hero ---------- */}
        <div className="max-w-2xl" data-tour="watch">
          <div className="mb-5 flex items-center gap-3">
            <p className="mono-label flex items-center gap-2">
              <Radar className="h-3.5 w-3.5 text-redline" /> Redline Watch
            </p>
            <Badge variant="warn">Continuous</Badge>
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            A clean audit is a snapshot. <span className="text-redline">Safety is a moving target.</span>
          </h1>
          <p className="mt-4 text-lg text-chalk-dim">
            Every prompt edit, model swap, or new tool re-opens the attack surface. Watch re-runs the
            full battery on a schedule and on every deploy — and tells you the moment a release makes
            your bot less safe.
          </p>
        </div>

        {/* ---------- Fleet summary ---------- */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <SummaryStat icon={Activity} label="Targets monitored" value={`${monitored}`} />
          <SummaryStat icon={TrendingDown} label="Within safe band" value={`${holding} / ${monitored}`} tone="safe" />
          <SummaryStat
            icon={AlertTriangle}
            label="Active regressions"
            value={`${alerts.length}`}
            tone={alerts.length > 0 ? "red" : "safe"}
          />
        </div>

        {/* ---------- Regression alerts ---------- */}
        {alerts.length > 0 ? (
          <div className="mt-8 space-y-3">
            {alerts.map(({ target, status }) => (
              <RegressionAlert key={target.id} target={target} status={status} />
            ))}
          </div>
        ) : null}

        {/* ---------- Monitored fleet ---------- */}
        <div className="mt-10">
          <p className="mono-label mb-4">Monitored fleet</p>
          <div className="space-y-3">
            {rows.map(({ target, status }) => (
              <WatchRow key={target.id} target={target} status={status} />
            ))}
          </div>
        </div>

        {/* ---------- Platform: how it wires in ---------- */}
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mono-label mb-3 flex items-center gap-2">
              <Webhook className="h-3.5 w-3.5 text-redline" /> Wire it into your pipeline
            </p>
            <h2 className="font-display text-2xl font-semibold">Red-team on every deploy.</h2>
            <p className="mt-2 text-sm leading-relaxed text-chalk-dim">
              Drop the action into CI and Redline re-audits the bot on every release, posts the
              risk delta to the PR, and can block the deploy if a change pushes risk into the danger
              band. A scanner you run once becomes a guardrail that runs forever.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-chalk-dim">
              <li className="flex items-start gap-2">
                <GitCommit className="mt-0.5 h-4 w-4 shrink-0 text-redline" />
                Deploy-triggered re-audits with the commit ref attached to every score.
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-redline" />
                Regression alerts the instant a release weakens the bot.
              </li>
              <li className="flex items-start gap-2">
                <Activity className="mt-0.5 h-4 w-4 shrink-0 text-redline" />
                Scheduled sweeps (hourly / daily / weekly) for drift between deploys.
              </li>
            </ul>
          </div>
          <CiSnippet />
        </div>
      </div>
    </main>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  tone?: "neutral" | "red" | "safe";
}) {
  const color = tone === "red" ? "text-redline" : tone === "safe" ? "text-safe" : "text-chalk";
  return (
    <div className="panel flex items-center gap-4 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-white/[0.02]">
        <Icon className={cn("h-5 w-5", color)} />
      </div>
      <div>
        <p className={cn("font-display text-2xl font-bold tabular-nums", color)}>{value}</p>
        <p className="font-mono text-[11px] uppercase tracking-wider text-chalk-faint">{label}</p>
      </div>
    </div>
  );
}

function RegressionAlert({ target, status }: { target: WatchTarget; status: WatchStatus }) {
  const p = status.lastPoint;
  return (
    <div className="panel grain relative overflow-hidden border-redline/40 bg-redline/[0.05] p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-redline" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-base font-semibold text-chalk">
              Regression on {target.name}
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-redline/40 bg-redline/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-redline-bright">
              <TrendingUp className="h-3 w-3" /> +{status.delta} risk
            </span>
            {p.deployRef ? (
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-chalk-faint">
                <GitCommit className="h-3 w-3" /> {p.deployRef}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-chalk-dim">
            Risk jumped <span className="font-mono text-chalk">{status.previous}</span> →{" "}
            <span className="font-mono text-redline">{status.current}</span>
            {p.note ? <> — {p.note}</> : null}
          </p>
        </div>
        <Link
          href={`/audit/${target.id}`}
          className="shrink-0 self-center rounded-md border border-redline/40 bg-redline/10 px-3 py-1.5 font-mono text-xs text-redline-bright transition-colors hover:bg-redline/20"
        >
          Re-audit →
        </Link>
      </div>
    </div>
  );
}

function WatchRow({ target, status }: { target: WatchTarget; status: WatchStatus }) {
  const band = bandMeta[status.band];
  const values = target.history.map((h) => h.score);
  const TrendIcon =
    status.trend === "improving" ? TrendingDown : status.trend === "regressed" ? TrendingUp : Minus;
  const trendColor =
    status.trend === "improving"
      ? "text-safe"
      : status.trend === "regressed"
        ? "text-redline"
        : "text-chalk-faint";
  const scoreColor =
    status.band === "secure" || status.band === "low"
      ? "text-safe"
      : status.band === "moderate"
        ? "text-warn"
        : "text-redline";

  return (
    <div
      className={cn(
        "panel grid items-center gap-4 p-5 sm:grid-cols-[1.4fr_auto_1fr_auto]",
        status.regression && "border-redline/40",
      )}
    >
      {/* Identity */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-chalk">{target.name}</p>
          <Badge variant={band.tone === "safe" ? "safe" : band.tone === "warn" ? "warn" : "danger"}>
            {band.label}
          </Badge>
        </div>
        <p className="mt-0.5 truncate font-mono text-[11px] text-chalk-faint">
          {target.business} · {target.sector}
        </p>
      </div>

      {/* Score + trend */}
      <div className="flex items-baseline gap-2">
        <span className={cn("font-display text-3xl font-bold tabular-nums", scoreColor)}>
          {status.current}
        </span>
        <span className={cn("inline-flex items-center gap-0.5 font-mono text-xs", trendColor)}>
          <TrendIcon className="h-3.5 w-3.5" />
          {status.delta === 0 ? "0" : status.delta > 0 ? `+${status.delta}` : status.delta}
        </span>
      </div>

      {/* Sparkline */}
      <div className="flex flex-col gap-1">
        <Sparkline values={values} />
        <p className="font-mono text-[10px] uppercase tracking-wider text-chalk-faint">
          {target.history.length} audits · {target.history[0].date.slice(5)} → {status.lastPoint.date.slice(5)}
        </p>
      </div>

      {/* Cadence */}
      <div className="text-right">
        <p className="font-mono text-[11px] uppercase tracking-wider text-chalk-dim">{target.cadence}</p>
        <p className="mt-0.5 font-mono text-[10px] text-chalk-faint">
          last {status.lastPoint.date.slice(5)}
        </p>
      </div>
    </div>
  );
}
