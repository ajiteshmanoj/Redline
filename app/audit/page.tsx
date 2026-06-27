import Link from "next/link";
import { ArrowLeft, ArrowRight, Globe } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { BotCard } from "@/components/bot-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BOTS } from "@/lib/bots";
import { ATTACKS, CATEGORIES } from "@/lib/attacks";
import { isDemoMode } from "@/lib/llm";

export default function AuditSelectPage() {
  const demo = isDemoMode();
  const riggedBots = BOTS.filter((b) => !b.independent);
  const independentBots = BOTS.filter((b) => b.independent);
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
            href="/reports"
            className="inline-flex items-center gap-2 text-sm text-chalk-faint transition-colors hover:text-chalk"
          >
            Saved reports →
          </Link>
        </div>

        <div className="max-w-2xl">
          <div className="mb-5 flex items-center gap-3">
            <p className="mono-label">Target selection</p>
            <Badge variant={demo ? "warn" : "safe"}>
              {demo ? "Demo mode" : "Live mode"}
            </Badge>
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Choose a target to red-team.
          </h1>
          <p className="mt-4 text-lg text-chalk-dim">
            Realistic Singapore SME deployments with realistic blind spots, plus one
            independent control bot we did not rig. Redline fires {ATTACKS.length} attacks
            across {CATEGORIES.length} categories at whichever you pick.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {riggedBots.map((bot, i) => (
            <BotCard key={bot.id} bot={bot} index={i} />
          ))}
        </div>

        {/* Independent control — a bot we did NOT author to be weak. */}
        {independentBots.length > 0 ? (
          <div className="mt-12">
            <div className="mb-5 flex items-center gap-3">
              <p className="mono-label">Independent control</p>
              <Badge variant="safe">Not rigged</Badge>
            </div>
            <p className="mb-6 max-w-2xl text-sm leading-relaxed text-chalk-dim">
              The bots above were written with deliberate blind spots. This one is a plain,
              standard small-business support assistant — no planted vulnerabilities, no special
              hardening. Redline audits it as a live black box over HTTP, so whatever it finds is
              genuine. On the live path it runs against its own{" "}
              <span className="font-mono text-chalk">/api/sample-bot</span> endpoint.
            </p>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {independentBots.map((bot, i) => (
                <BotCard key={bot.id} bot={bot} index={i} />
              ))}
            </div>
          </div>
        ) : null}

        {/* Live target — audit your own / any external bot */}
        <div className="mt-6 panel grain relative overflow-hidden p-6 sm:p-8">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(700px_circle_at_85%_0%,rgba(255,59,59,0.10),transparent_60%)]" />
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-redline/40 bg-redline/10 text-redline-bright">
                <Globe className="h-5 w-5" />
              </div>
              <div className="max-w-xl">
                <h2 className="font-display text-xl font-semibold">Audit your own live bot.</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-chalk-dim">
                  Not a demo — paste any chatbot&apos;s HTTP endpoint and Redline runs the real
                  battery against the live bot, then judges the actual responses. One-click FoxDesk
                  preset included.
                </p>
              </div>
            </div>
            <Link href="/audit/new" className="shrink-0">
              <Button className="group">
                Add a live target
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
