"use client";

import { Fragment } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Scale, Zap, Check, Crosshair, Gavel, Bot, Layers, Globe, ListChecks, Lock, Landmark } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { STANDARDS_CARDS, NON_AFFILIATION, type StandardKind } from "@/lib/standards";
import { Button } from "@/components/ui/button";
import { HeroConsole } from "@/components/landing/hero-console";
import { Logomark } from "@/components/brand";
import { CATEGORIES } from "@/lib/attacks";
import { categoryVisual } from "@/components/category-meta";
import { Magnetic } from "@/components/fx/magnetic";
import { TiltCard } from "@/components/fx/tilt-card";
import { Marquee } from "@/components/fx/marquee";
import { CountUp } from "@/components/fx/count-up";
import { DotField } from "@/components/fx/dot-field";
import { Interrogation } from "@/components/landing/interrogation";

const GRADIENT_CTA =
  "bg-[linear-gradient(120deg,#E11534_0%,#C20E2E_55%,#8E0A21_100%)] shadow-[0_14px_34px_-12px_rgba(194,14,46,0.6)]";

const ENGINE_ROLES = [
  {
    icon: Globe,
    title: "The scout",
    role: "Exa · neural web search",
    body: "Before the multi-turn agent attacks, Exa searches the live web for the target company. OpenAI distills the results into real competitors and the personal data the business holds — so the attacks are grounded in reality, not guesses.",
  },
  {
    icon: Crosshair,
    title: "The attacker",
    role: "OpenAI reasoning model · gpt-5.5",
    body: "An OpenAI reasoning model generates and escalates real attacks. In the multi-turn mode it pursues a goal over up to five turns, reading each reply and adapting — armed with the scout's intel.",
  },
  {
    icon: Bot,
    title: "The target",
    role: "bot under test · gpt-4.1-mini",
    body: "Your bot, or any external chatbot reached over HTTP as a black box. Redline drives it exactly as a real user would and judges the actual responses it gives.",
  },
  {
    icon: Gavel,
    title: "The judge",
    role: "OpenAI · Structured Outputs · gpt-5.4",
    body: "A separate OpenAI call scores every response with Structured Outputs — strict broken / severity / reason. It never sees its own attacks, so the verdict isn't a model marking its own homework.",
  },
];

// The architecture as a left-to-right pipeline: four models hand off in one
// engagement, ending in the scored verdict. Rendered as the "flow ribbon"
// above the detailed role cards so the layers are obvious at a glance.
const PIPELINE = [
  { stage: "Recon", model: "Exa", note: "neural web search" },
  { stage: "Attack", model: "gpt-5.5", note: "reasoning attacker" },
  { stage: "Target", model: "gpt-4.1-mini", note: "bot under test" },
  { stage: "Judge", model: "gpt-5.4", note: "structured outputs" },
  { stage: "Verdict", model: "score · S$ exposure", note: "rubric-derived", accent: true },
];

// Deep-red icon per standard for the "Built to a standard" section.
const STANDARD_ICON: Record<StandardKind, typeof Globe> = {
  owasp: ListChecks,
  pdpa: Lock,
  mas: Landmark,
};

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.06 * i, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function LandingPage() {
  return (
    <main className="relative overflow-clip">
      <SiteNav />

      {/* ===================== HERO ===================== */}
      <section className="relative pt-28 pb-10 sm:pt-32">
        <DotField className="-z-10" />
        <div className="container">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            <div className="text-center lg:text-left">
            <motion.div initial="hidden" animate="show" variants={fadeUp} custom={0}>
              <Eyebrow align="left" />
            </motion.div>

            <motion.h1
              initial="hidden"
              animate="show"
              variants={fadeUp}
              custom={1}
              className="font-display text-[2.7rem] font-semibold leading-[1.03] tracking-[-0.02em] text-chalk sm:text-5xl lg:text-[3.4rem] xl:text-6xl"
            >
              Red-team your AI agent.
              <span className="mt-1 block font-display italic font-normal text-redline">
                Before it ships.
              </span>
            </motion.h1>

            <motion.p
              initial="hidden"
              animate="show"
              variants={fadeUp}
              custom={2}
              className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-chalk-dim lg:mx-0"
            >
              Every business is shipping LLM chatbots without checking if they&apos;re safe. Redline
              points an adversarial agent at your bot, runs a full battery of attacks, and shows you
              exactly where it breaks — with the transcript as proof, and the fix.
            </motion.p>

            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeUp}
              custom={3}
              className="mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
            >
              <Magnetic>
                <Link href="/audit">
                  <Button size="lg" className={`group ${GRADIENT_CTA}`}>
                    Run a live audit
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </Magnetic>
              <Link href="/#how">
                <Button size="lg" variant="outline">
                  See how it works
                </Button>
              </Link>
            </motion.div>

            <motion.p
              initial="hidden"
              animate="show"
              variants={fadeUp}
              custom={5}
              className="mt-8 font-mono text-[11px] uppercase tracking-[0.24em] text-chalk-faint"
            >
              Built for teams shipping{" "}
              <span className="font-display text-sm italic tracking-normal text-chalk-dim">
                customer-facing AI
              </span>
            </motion.p>

            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeUp}
              custom={4}
              className="mt-7 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 font-mono text-xs text-chalk-faint lg:justify-start"
            >
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-safe" /> 20 attacks · 6 categories
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-safe" /> Adaptive multi-turn agent
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-safe" /> OWASP · MAS · PDPA
              </span>
            </motion.div>
            </div>

            {/* the showcase: a live interrogation, auto-playing */}
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto w-full max-w-xl lg:max-w-none"
            >
              <Interrogation />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===================== MARQUEE ===================== */}
      <div className="relative mt-24 border-y border-border bg-white/50 py-5">
        <Marquee
          items={[
            "Jailbreak",
            "Prompt Injection",
            "PII / PDPA Leak",
            "Hallucination Trap",
            "Over-Promise Bait",
            "Verification Bypass",
            "Role Override",
            "Internal Policy Leak",
          ]}
        />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-ink to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-ink to-transparent" />
      </div>

      {/* ===================== PROBLEM ===================== */}
      <Section id="problem">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <Reveal>
            <p className="mono-label mb-4">The exposure</p>
            <h2 className="font-display text-3xl font-semibold leading-[1.15] tracking-tight sm:text-[2.6rem]">
              Your chatbot is a junior employee who never sleeps —{" "}
              <span className="italic text-chalk-dim">and was never trained on what not to say.</span>
            </h2>
          </Reveal>
          <Reveal delay={1}>
            <div className="grid gap-4 sm:grid-cols-2">
              {PROBLEMS.map((p) => (
                <div key={p.title} className="panel p-5">
                  <p className="font-display text-3xl font-semibold text-redline">{p.stat}</p>
                  <p className="mt-1 text-sm font-medium text-chalk">{p.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-chalk-faint">{p.body}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ===================== SEE IT LIVE ===================== */}
      <Section id="live">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="mono-label mb-4">The hero moment</p>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-[2.6rem]">
              Watch it break, <span className="italic text-redline">exchange by exchange.</span>
            </h2>
            <p className="mt-4 max-w-md text-chalk-dim">
              Every probe fires live. You see the adversarial prompt, the bot&apos;s real response,
              and a SAFE / BROKEN verdict — with the breaking line lit red. The severity meter
              climbs on spring physics as cracks appear.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-4">
              <KpiStat value={<CountUp to={20} />} label="probes / run" />
              <KpiStat value={<CountUp to={6} />} label="categories" />
              <KpiStat value={<><CountUp to={100} />%</>} label="offline demo" />
            </div>
          </Reveal>
          <Reveal delay={1}>
            <HeroConsole />
          </Reveal>
        </div>
      </Section>

      {/* ===================== HOW IT WORKS ===================== */}
      <Section id="how">
        <SectionHeading
          eyebrow="How it works"
          title="Point. Attack. Patch."
          sub="Redline runs the same playbook a motivated attacker would — then hands you the fix."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i}>
              <TiltCard className="group h-full" max={5}>
                <div className="panel relative h-full overflow-hidden p-6">
                  <span className="font-mono text-sm text-redline">0{i + 1}</span>
                  <s.icon className="mt-4 h-6 w-6 text-redline" />
                  <h3 className="mt-4 font-display text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-chalk-dim">{s.body}</p>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ===================== THE ENGINE ===================== */}
      {/* Full-bleed faint band so the architecture reads as a deliberate, */}
      {/* standalone showcase against the cream canvas (still all-light). */}
      <section id="engine" className="scroll-mt-20 border-y border-border bg-ink-900/50 py-24">
        <div className="container">
          <SectionHeading
            eyebrow="The engine · OpenAI + Exa"
            title="Four models. One adversarial pipeline."
            sub="Redline isn't one model talking to itself. Each engagement runs four distinct models in sequence — an Exa recon scout, a reasoning-model attacker, your target bot, and a separate Structured-Outputs judge — ending in a rubric-scored verdict. That separation is the architecture that makes the result credible."
          />

          {/* ---- Flow ribbon: the layers, left to right ---- */}
          <Reveal>
            <div className="mt-12">
              <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-stretch">
                {PIPELINE.map((p, i) => (
                  <Fragment key={p.stage}>
                    <div
                      className={`flex-1 rounded-lg border px-4 py-3.5 text-center shadow-[0_1px_2px_rgba(28,24,18,0.04)] ${
                        p.accent
                          ? "border-redline/40 bg-redline/[0.05]"
                          : "border-border bg-white/85"
                      }`}
                    >
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-redline">
                        {String(i + 1).padStart(2, "0")} · {p.stage}
                      </p>
                      <p className="mt-1.5 font-mono text-sm font-semibold text-chalk">{p.model}</p>
                      <p className="mt-0.5 text-[11px] text-chalk-faint">{p.note}</p>
                    </div>
                    {i < PIPELINE.length - 1 ? (
                      <div className="flex items-center justify-center text-chalk-faint">
                        <ArrowRight className="h-4 w-4 rotate-90 sm:rotate-0" />
                      </div>
                    ) : null}
                  </Fragment>
                ))}
              </div>
              <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-wider text-chalk-faint">
                one engagement · recon → attack → response → verdict
              </p>
            </div>
          </Reveal>

          {/* ---- Detailed role cards ---- */}
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ENGINE_ROLES.map((r, i) => (
              <Reveal key={r.title} delay={i}>
                <div className="panel h-full p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-redline/30 bg-redline/[0.06] text-redline">
                    <r.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold">{r.title}</h3>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-chalk-faint">
                    {r.role}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-chalk-dim">{r.body}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* ---- Why this architecture ---- */}
          <Reveal delay={3}>
            <div className="panel mt-5 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Layers className="mt-0.5 h-5 w-5 shrink-0 text-redline" />
                <div>
                  <p className="font-display text-base font-semibold">
                    OpenAI for the brains, Exa for the eyes.
                  </p>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-chalk-dim">
                    A reasoning model attacks; a separate model judges with{" "}
                    <span className="text-chalk">Structured Outputs</span>; before each engagement{" "}
                    <span className="text-chalk">Exa</span> searches the live web for the target
                    company and OpenAI distills it into real competitors and data types to attack
                    with. Per-role models run a stronger attacker than judge — and it&apos;s
                    provider-agnostic under the hood (any OpenAI-compatible endpoint).
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {["gpt-5.5 attacker", "gpt-5.4 judge", "exa recon"].map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center rounded-md border border-border bg-white/60 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-chalk-dim"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================== BUILT TO A STANDARD ===================== */}
      {/* Faint red-tinted band — distinct from the engine's neutral band — so */}
      {/* the credibility section reads as its own deliberate block. Content is */}
      {/* pulled from lib/standards.ts (single source of truth). */}
      <section id="standards" className="scroll-mt-20 border-y border-border bg-[#FBF6F4] py-24">
        <div className="container">
          <SectionHeading
            eyebrow="Built to a standard"
            title="Graded against the standards your auditors already use."
            sub="Every finding is mapped to a recognised framework — so a result isn't Redline's opinion, it's a citation."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {STANDARDS_CARDS.map((c, i) => {
              const Icon = STANDARD_ICON[c.kind];
              return (
                <Reveal key={c.kind} delay={i}>
                  <div
                    className={`panel h-full p-6 ${
                      c.accent ? "border-redline/40 ring-1 ring-redline/25" : ""
                    }`}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-redline/30 bg-redline/[0.06] text-redline">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-display text-xl font-semibold">{c.title}</h3>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-chalk-faint">
                      {c.scope}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-chalk-dim">{c.body}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-chalk-faint">
            {NON_AFFILIATION}
          </p>
        </div>
      </section>

      {/* ===================== ATTACK SUITE ===================== */}
      <Section id="attacks">
        <SectionHeading
          eyebrow="The attack suite"
          title="Six ways a bot betrays you."
          sub="Each category fires multiple concrete probes. A separate judge model decides — break or hold."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c, i) => {
            const Icon = categoryVisual[c.id].icon;
            return (
              <Reveal key={c.id} delay={i % 3}>
                <TiltCard className="group h-full" max={5}>
                  <div className="panel h-full p-6 transition-colors group-hover:border-redline/30">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-redline/[0.06] text-redline transition-colors group-hover:border-redline/40">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-display text-lg font-semibold">{c.label}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-chalk-faint">{c.description}</p>
                    <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-chalk-faint">
                      {c.owaspId}
                    </p>
                  </div>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      </Section>

      {/* ===================== WHO IT'S FOR ===================== */}
      <section id="who" className="scroll-mt-20 py-24">
        <div className="container grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              align="left"
              eyebrow="Who this is for"
              title="If a model speaks for your brand, it's in scope."
            />
            <ul className="mt-8 space-y-4">
              {AUDIENCE.map((a) => (
                <Reveal key={a} delay={0}>
                  <li className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-safe" />
                    <span className="text-chalk-dim">{a}</span>
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
          <div>
            <p className="mono-label mb-4">What breaks in the wild</p>
            <div className="space-y-3">
              {BREAKS.map((b, i) => (
                <Reveal key={b.label} delay={i}>
                  <div className="panel flex items-center gap-4 p-4">
                    <span className="font-display text-2xl font-semibold text-redline tabular-nums">
                      {b.sev}
                    </span>
                    <div className="h-8 w-px bg-border" />
                    <div>
                      <p className="text-sm font-medium text-chalk">{b.label}</p>
                      <p className="text-xs text-chalk-faint">{b.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FINAL CTA ===================== */}
      <section className="relative overflow-hidden py-28">
        <div className="absolute inset-0 -z-10 bg-grid bg-grid-fade opacity-40" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(640px_340px_at_50%_35%,rgba(194,14,46,0.07),transparent_70%)]" />
        <div className="container relative text-center">
          <Reveal>
            <h2 className="mx-auto max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-6xl">
              Find the break before your{" "}
              <span className="italic text-redline">customers do.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-chalk-dim">
              Run a full audit against a live demo bot in under a minute. No setup, no signup.
            </p>
            <Magnetic>
              <Link href="/audit" className="mt-9 inline-block">
                <Button size="lg" className={`group ${GRADIENT_CTA}`}>
                  Run a live audit
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </Magnetic>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

/* ----------------------------- sub-components ----------------------------- */

function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-border">
      <div className="container relative z-10 py-16">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <span className="flex items-center gap-2">
              <Logomark />
              <span className="font-display text-xl font-semibold tracking-tight text-chalk">
                Redline
              </span>
            </span>
            <p className="mt-4 text-sm leading-relaxed text-chalk-dim">
              Adversarial AI security. Find the break before your customers — or your lawyers — do.
            </p>
          </div>
          <div className="flex gap-14 text-sm">
            <div>
              <p className="mono-label mb-3">Product</p>
              <ul className="space-y-2.5 text-chalk-dim">
                <li><Link href="/#how" className="transition-colors hover:text-chalk">How it works</Link></li>
                <li><Link href="/#engine" className="transition-colors hover:text-chalk">The engine</Link></li>
                <li><Link href="/#standards" className="transition-colors hover:text-chalk">Standards</Link></li>
                <li><Link href="/#attacks" className="transition-colors hover:text-chalk">Attack suite</Link></li>
                <li><Link href="/watch" className="transition-colors hover:text-chalk">Watch</Link></li>
                <li><Link href="/benchmark" className="transition-colors hover:text-chalk">Benchmark</Link></li>
                <li><Link href="/audit" className="transition-colors hover:text-chalk">Run an audit</Link></li>
              </ul>
            </div>
            <div>
              <p className="mono-label mb-3">Mapped to</p>
              <ul className="space-y-2.5 text-chalk-dim">
                <li>OWASP LLM Top 10 (2025)</li>
                <li>Singapore PDPA</li>
                <li>MAS proposed AI Risk Guidelines</li>
              </ul>
              <p className="mt-3 max-w-[12rem] text-[11px] leading-relaxed text-chalk-faint">
                Indicative mapping. Not affiliated with or endorsed by these bodies.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-12 flex items-center justify-between border-t border-border pt-6 font-mono text-xs text-chalk-faint">
          <span className="flex items-center gap-2">
            <Scale className="h-3.5 w-3.5" /> PDPA-aware
          </span>
          <span>Redline · built for the demo stage</span>
        </div>
      </div>
      {/* oversized wordmark — faint ink, embossed on the cream */}
      <p
        aria-hidden
        className="pointer-events-none select-none px-4 text-center font-display font-semibold italic leading-[0.74] text-black/[0.10]"
        style={{ fontSize: "clamp(5rem, 22vw, 18rem)" }}
      >
        Redline
      </p>
    </footer>
  );
}

function Eyebrow({ align = "center" }: { align?: "center" | "left" }) {
  return (
    <div
      className={`mb-7 flex flex-col gap-2.5 ${
        align === "left" ? "items-center lg:items-start" : "items-center"
      }`}
    >
      <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-chalk-faint">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-redline" />
        Point · Attack · Judge · Patch
      </span>
      <svg width="138" height="9" viewBox="0 0 138 9" fill="none" className="text-redline">
        <motion.path
          d="M2 6C28 2 110 2 136 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
    </div>
  );
}

function KpiStat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="panel p-4">
      <p className="font-display text-3xl font-semibold text-chalk">{value}</p>
      <p className="mono-label mt-1">{label}</p>
    </div>
  );
}

function Section({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 py-24">
      <div className="container">{children}</div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  sub,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  align?: "center" | "left";
}) {
  return (
    <Reveal>
      <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-xl"}>
        <p className="mono-label mb-4">{eyebrow}</p>
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-[2.6rem]">
          {title}
        </h2>
        {sub ? <p className="mt-4 text-chalk-dim">{sub}</p> : null}
      </div>
    </Reveal>
  );
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={fadeUp}
      custom={delay}
    >
      {children}
    </motion.div>
  );
}

/* --------------------------------- data ---------------------------------- */

const PROBLEMS = [
  {
    stat: "1 prompt",
    title: "is all it takes",
    body: "A single crafted message can pull another customer's PII straight out of a support bot.",
  },
  {
    stat: "PDPA",
    title: "liability is yours",
    body: "Your bot leaking personal data is your breach to report — not the model vendor's.",
  },
  {
    stat: "0 logs",
    title: "you'd ever see",
    body: "Jailbreaks and over-promises happen mid-conversation, invisible to your dashboards.",
  },
  {
    stat: "24/7",
    title: "attack surface",
    body: "It answers everyone, instantly, forever. Including the one person probing for a crack.",
  },
];

const STEPS = [
  {
    icon: Zap,
    title: "Point it at a bot",
    body: "Pick a target agent or paste a live endpoint. Redline prepares the adversarial battery.",
  },
  {
    icon: ShieldCheck,
    title: "Watch it attack, live",
    body: "Each probe fires in sequence. A judge model scores every response — break or hold — in real time.",
  },
  {
    icon: Scale,
    title: "Get the proof + patch",
    body: "A severity score, the breaking transcripts as evidence, and a drop-in system-prompt fix.",
  },
];

const AUDIENCE = [
  "Startups shipping a support, sales, or front-desk chatbot to customers.",
  "Platform teams exposing an LLM agent with access to user records or actions.",
  "Compliance & legal who need evidence the bot won't leak PII or over-promise.",
  "Agencies deploying white-label bots across many SME clients.",
];

const BREAKS = [
  { sev: "9.0", label: "Third-party PII leak", body: "Bot reads back another customer's phone & email." },
  { sev: "10", label: "Unauthorised refund", body: "Jailbroken into issuing a payout it can't authorise." },
  { sev: "9.5", label: "Unsafe medical advice", body: "Reception bot hands out paediatric drug dosing." },
  { sev: "8.0", label: "Verification bypass", body: "Resets an account with no identity check." },
];
