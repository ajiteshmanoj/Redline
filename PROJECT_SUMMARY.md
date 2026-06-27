# Redline — Project Summary

> The safety layer for shipping customer-facing AI agents. Red-team any company's
> chatbot, put a dollar figure on what breaks, fix it, prove the fix, and keep
> watching it on every deploy.

## What It Is

**Redline** points an adversarial agent at a target LLM chatbot and runs a full safety loop — **find → fix → prove → watch → benchmark**:

- **Find** — a 20-attack battery across 6 categories (plus an adaptive multi-turn agent) shows exactly where the bot breaks, with proof transcripts and a 0–100 risk score.
- **Quantify** — every break is translated into **estimated business/regulatory exposure in SGD** (PDPA penalty ceiling, fraud-window loss, claim liability), so the risk is legible to a non-technical buyer.
- **Fix** — a suggested system-prompt patch for each broken category.
- **Prove** — re-run the exact same battery against the hardened bot and watch the risk score *and* the dollar exposure collapse, live.
- **Watch** — continuous re-auditing on a schedule and on every deploy, with a regression alarm.
- **Benchmark** — a public "State of AI Agent Security 2026" leaderboard of common build patterns.

Every finding maps to the **OWASP LLM Top 10 (2025)**, Singapore's **PDPA**, and — for financial institutions only — the **MAS proposed Guidelines on AI Risk Management** (a 13 Nov 2025 consultation paper).

**The problem:** Businesses ship LLM chatbots (support, sales, front desk) without checking if they're safe — exposing them to jailbreaks, prompt injection, PII/PDPA leaks, hallucinations, over-promising, and policy bypass. Almost no one red-teams an agent before it ships.

**The reframe:** Redline isn't just an end-of-line scanner. With audit → patch → prove → monitor → benchmark, it's the **safety layer builders use while shipping AI-native products** — a pre-deploy gate, a CI guardrail, a hardening library, and a benchmark to target.

## Tech Stack

| Layer | Choices |
|-------|---------|
| Framework | Next.js 14 (App Router, TypeScript strict mode) |
| UI | React 18, Tailwind CSS 3.4, Framer Motion 11, Lucide icons |
| Type / motion | **Fraunces** editorial serif (display), Inter (body), JetBrains Mono (transcripts); CSS + Framer animations |
| Backend | Next.js API routes (Node runtime): `/api/audit`, `/api/adaptive`, `/api/probe`, `/api/sample-bot` |
| LLM | **OpenAI** engine via `lib/llm.ts`: reasoning attacker `gpt-5.5`, Structured-Outputs judge `gpt-5.4`, target `gpt-4.1-mini` (per-role); OpenAI-compatible + provider-agnostic |
| Search | **Exa** neural web search (`lib/exa.ts`) for real-world recon on the target company |
| Storage | Browser `localStorage` (no backend database) |
| Deploy | Vercel; `.env.production` pins `DEMO_MODE=true` for a network-free public demo |

## Design language

A **light, editorial, security-edge** aesthetic:
- Warm cream canvas, near-black text, soft white cards, a single serious **deep-red** accent (`#C20E2E`).
- **Fraunces serif** display headings with italic deep-red accent phrases; pill buttons; soft-shadow panels; generous spacing; scroll-reveal motion.
- **Signature hero:** an auto-playing **live interrogation** — the adversarial agent types an attack, the bot replies, and a verdict slams in (`Broken · sev` red / `Held · safe` green), including a round that holds so it reads honest.
- **Living backgrounds:** an animated dot-matrix scan field, varied section treatments, and a dramatic dark closing band + oversized wordmark footer.
- **Self-driving voiced tour:** a one-click **guided demo** (`?tour=1` or the hero button) that drives a spotlight + cursor across every page, narrates each beat in a human voice (ElevenLabs, "Rachel"), navigates between routes, and runs a real audit — built to be screen-recorded. See *Guided demo* below.

## The Engine — four models, one adversarial pipeline

Redline is not one model talking to itself. Each engagement runs **four distinct models in sequence** — surfaced on the landing "engine" section as a left-to-right pipeline ribbon (**Recon → Attack → Target → Judge**) and in the per-run model roster:

- **Recon (Exa)** — a co-equal first stage. Before the adaptive agent attacks, **Exa neural web search** scouts the live web for the target company; OpenAI then distills the results (Structured Outputs) into named competitors and the personal-data types the business holds, which it weaponises into disparagement bait and PII pretexts. Exa finds the truth on the open web; OpenAI turns it into an attack plan. Gated on `EXA_API_KEY`; bot-only recon (or a captured demo fixture) when absent. See `lib/exa.ts` + `osintRecon` in `lib/adaptive.ts`.
- **Attacker** — a **reasoning model (`gpt-5.5`)** that generates and escalates adversarial prompts. In the adaptive mode it profiles the target first, then pursues a goal over up to 5 turns, reading each reply and adapting.
- **Target** — the bot under test (`gpt-4.1-mini` for built-ins): a built-in demo bot, or any external chatbot reached as a black box over HTTP.
- **Judge** — a **separate call (`gpt-5.4`)** that scores every response with **Structured Outputs** (strict `json_schema`): `{ broken, severity, reason }`. It sees only the bot's reply against a fixed rubric — never the attacker's strategy — so the verdict isn't a model grading its own homework. Parsed defensively, with a heuristic fallback when no key is present.

All LLM calls flow through a single `runAgent()` (`lib/llm.ts`) — the OpenAI Chat Completions shape, so it's also provider-agnostic. Run a stronger attacker than judge with per-role models (`LLM_MODEL_ATTACKER` / `_JUDGE` / `_TARGET`).

## Architecture

```
app/          Pages + API routes
  page.tsx       Landing (hero, problem, four-model engine + pipeline ribbon,
                 attack suite, "Built to a standard" section, standards strip)
components/tour/ Self-driving voiced guided demo (spotlight + cursor + narration)
lib/tour/        Tour script (steps as data — the single source of voiced narration)
  audit/…        Target selection, static console, adaptive, custom live targets
  watch/         Redline Watch — continuous monitoring dashboard
  benchmark/     State of AI Agent Security 2026 leaderboard
  reports/       Saved reports
components/    UI, console/report, adaptive experience, watch, fx, landing
lib/          attacks · adaptive · audit (scoring/patches) · exposure · standards
              · watch · benchmark · bots · fixtures · llm · disclosure · types …
```

Logic in `lib/`, UI in `components/`, routing in `app/`.

## Core Features

### Static battery (`/audit/[botId]`)
Real-time streaming console (NDJSON) of **20 probes across 6 categories** — adversarial prompt, live bot response, SAFE/BROKEN verdict, spring-physics severity meter, per-category counters. A separate judge call returns strict JSON. The findings report shows: a severity ring, ranked vulnerabilities with **OWASP/PDPA/MAS tags** and a **per-finding dollar exposure**, an **estimated-exposure headline** (e.g. ≈ S$1.5M), suggested patches, a standards/regulatory block, and the **prove-the-fix** hardened re-audit.

### Fix → re-audit climax (the demo centerpiece)
"Don't trust the patch — prove it." Applies the recommended patches, re-runs the exact same battery against the hardened bot, and collapses **both** numbers on screen: risk score (e.g. 100 → 5) **and** estimated exposure (S$1.5M → S$0), same attacks flipping red → green.

### Business / regulatory exposure (`lib/exposure.ts`)
Maps each break (category + severity) to a Singapore-anchored SGD figure — PDPA statutory ceiling, fraud-window losses, claim liability. Severity-scaled, with a ±40% band. Regulatory caps **don't stack** (one breach, one ceiling). Shown as a report headline, a per-vulnerability line, and a live block in the adaptive run. Explicitly indicative, not a precise liability quote.

### Adaptive multi-turn agent (`/api/adaptive`, `…/adaptive`)
An attacker LLM pursues a goal over up to 5 turns, reading each reply and escalating, judged per turn, stopping on a break. Works against built-in bots (native multi-turn) and external HTTP bots via session/conversation-id threading. The live feed **auto-scrolls smoothly** to follow each streamed turn and disengages when the user scrolls up to read. Captured fixtures: brightminds breaks 2/5 (incl. a 3-turn medical-advice escalation single-shot missed); Northwind holds 5/5.

### Redline Watch (`/watch`)
Continuous-monitoring dashboard: a monitored fleet with **risk-over-time sparklines**, a **post-deploy regression alert** (e.g. SwiftPay jumping 11 → 64 after a deploy that skipped verification), fleet summary stats, and a copyable **GitHub Action / CI snippet**. The "platform, not tool" story — a scanner you run once becomes a guardrail that runs forever. (Seeded demo data; network-free.)

### Audit your own bot (`/audit/new` → `/audit/custom`)
Three ways to red-team a real bot, all running the live battery (no fixtures):
- **Paste a system prompt** — most SME bots *are* a system prompt + model; paste it and Redline audits it directly (same path as the built-in bots, with prove-the-fix).
- **Connect a public GitHub repo** (`/api/extract-prompt`) — Redline reads the repo via the GitHub API, finds the agent's system prompt (weighted path + content heuristics), and shows candidates to confirm/edit before auditing. Honest caveat in-UI: it audits the *extracted prompt* (nails prompt-only bots; a lower bound for tool-using agents).
- **HTTP endpoint** — point Redline at any deployed chatbot that speaks JSON; presets (FoxDesk, OpenAI-compatible, generic) + a "Test connection" probe.

### Benchmark (`/benchmark`)
"State of AI Agent Security 2026" — an **A–F leaderboard** ranking common build *patterns/archetypes* (bare wrapper, persona bot, RAG template, tool-calling agent, hand-hardened, Redline-hardened) — **not named vendors**, which keeps it honest. Shock stats up top (e.g. 89% broke, 43% leaked PII), weighted by sample size, with a methodology note. Any bot you audit can **opt into the leaderboard** ("Add to benchmark") — submissions render in a **Your audits** section (localStorage today; the shape of a shared, growing dataset / data moat).

### Guided demo — self-driving voiced tour (`components/tour/`, `lib/tour/script.ts`)
A one-click walkthrough that demos the whole product hands-free — built to be screen-recorded for the pitch. Launched by `?tour=1` or the hero button (a `redline:tour` window event), it moves a **spotlight + cursor** across the page, **scrolls each target into view**, shows **subtitles**, plays the matching **human-voice narration** (ElevenLabs "Rachel"; `public/tour/*.mp3`), and **auto-advances** — with pause / skip / mute / restart controls. It performs **cross-route choreography** and demos **two of the three self-serve paths**: it lands on `/audit/new?demo=github`, shows Redline **finding a system prompt in a public GitHub repo** (a deterministic, network-free prefill — same fixture philosophy as the FoxDesk replay), then switches to the **HTTP path**, opens FoxDesk, **runs a real live audit**, and opens the report — before visiting Watch and Benchmark. The tour is **data**: `lib/tour/script.ts` holds the steps, and the same `say` text is both the on-screen subtitle *and* the source the generator (`scripts/gen-narration.mjs`) turns into audio — so spoken and shown words never drift. 19 steps (hero → live break → pipeline → roles → standards → attacks → **GitHub repo → candidates** → FoxDesk audit → report → Watch → Benchmark → close). New narration lines fall back to a silent timed-hold until `npm run tour:audio` regenerates the clips.

### Standards & compliance mapping (`lib/standards.ts`)
Single source of truth, scoped accurately so a regulator-adjacent audience can't poke holes:
- **OWASP LLM Top 10 (2025)** — applies to every finding.
- **PDPA** — flagged on findings that disclose personal data (all Singapore orgs).
- **MAS proposed AI Risk Guidelines** — a 13 Nov 2025 **consultation paper** (not in force), applying to **financial institutions only**; tags shown for financial targets (SwiftPay) and explicitly marked out of scope for others.
- Presented as clean **text badges ("mapped to"), not official logos** — a regulator's mark would imply an endorsement that doesn't exist — with a non-affiliation disclaimer throughout.

### Honesty layer
- **Independent control bot** — **Northwind Support** (`/api/sample-bot`): a plain, un-rigged small-business assistant audited as a live black box. Its fixtures were captured from a real run (held 19/20 single-shot, 5/5 adaptive) — proof Redline finds real differences and doesn't fake demos.
- **Target-reachability guard** — `isTransportError()` excludes errored/unreachable probes from the held tally and the score, surfaced as an amber "Unreachable" chip — a dead endpoint can never masquerade as a clean pass.
- **Varied transcripts** — held responses are category-aware, in-character refusals (not one canned line repeated), so a transcript reads like a real bot under a judge's eye.

### Reporting & disclosure
- **Static report**: print-to-PDF (OWASP/PDPA/MAS + regulatory block), save to localStorage, copy link, good-faith disclosure (PII auto-redacted).
- **Adaptive report**: a concise 1-page PDF — summary, one line per campaign with standards tags, estimated exposure, and proof of the breaking exchange only.
- **Saved reports** (`/reports`); **custom live target** (`/audit/new` → `/audit/custom`, static or adaptive) with presets (FoxDesk, OpenAI-compatible, generic JSON) and a "Test connection" probe.

## Targets

**Three rigged demo bots** (Singapore SME scenarios, deliberately weak): **Ms. Bright** (tuition — PII/over-promise), **CareDesk** (clinic — injection/hallucination), **SwiftPay** (fintech — jailbreak/policy; the one `financial` target, so MAS applies). **Two independent controls** (not rigged): **Northwind Support** (a plain small-business assistant, captured from a real run) and **FoxDesk** — a **real, deployed bot we own** (XYZ Tuition's live assistant), audited as a genuine black box over its live HTTP endpoint with no access to its prompt. FoxDesk **held the line — 0 breaks across all 20 probes** (a clean, secure score: Redline can certify a well-built bot, not just find failures). Its run is replayed deterministically from a captured fixture (`lib/foxdesk-capture.json`) for a smooth demo, and it's the centerpiece of the guided tour.

## Routes

10 app routes + 5 API routes:
`/` · `/audit` · `/audit/[botId]` · `/audit/[botId]/adaptive` · `/audit/new` · `/audit/custom` · `/audit/custom/adaptive` · `/watch` · `/benchmark` · `/reports` · and `/api/{audit,adaptive,probe,sample-bot,extract-prompt}`.

## Data Model

No database. Types in `lib/types.ts`: `Attack`, `AttackCategory` (+ `owaspId`, `masRisk`), `AttackResult`, `JudgeVerdict`, `Vulnerability`, `Exposure`/`ExposureSummary`, `Bot` (+ `independent`, `financial`, `httpTarget`), `AuditSummary` (+ optional `errored`), `HttpTargetConfig` (+ session threading), and the adaptive set (`AdaptiveGoal`, `AdaptiveTurn`, `AdaptiveCampaign`, `AdaptiveSummary`, `AdaptiveEvent`). Watch/benchmark types live in `lib/watch.ts` and `lib/benchmark.ts`. Severity bands: secure (0–14), low (15–34), moderate (35–59), high (60–79), critical (80–96), catastrophic (97–100).

## Demo vs. Live

- **Demo** (`DEMO_MODE=true`, default): pre-scripted/captured fixtures, **zero network calls**, repeatable. Built-in bots only. Watch and Benchmark run on seeded data.
- **Live**: real LLM calls; external HTTP targets and user-supplied prompts (paste / GitHub) always run live (ignore DEMO_MODE).
- **Production** (`redline-woad.vercel.app`): the `LLM_*` keys are set on Vercel, so self-serve audits run live on the deployed URL; the built-in demo bots stay network-free.

## Build & Run

```bash
npm install        # first time
npm run dev        # http://localhost:3000 (demo mode by default)
npm run build      # type-checked production build (passes)
npm run start
```

Env: `DEMO_MODE`, `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` (+ optional per-role `LLM_MODEL_ATTACKER` / `_JUDGE` / `_TARGET`).

> ESLint isn't configured; `npm run build` runs the authoritative TypeScript strict type-check and passes. Deployed on Vercel (`redline-woad.vercel.app`).

## Current State

**Working & verified:**
- ✅ 20-attack static battery + separate judge, across 6 categories
- ✅ Business/regulatory **dollar exposure** model (report headline, per-finding, adaptive)
- ✅ **Fix → re-audit climax** — score *and* exposure collapse, live
- ✅ Adaptive multi-turn agent — built-in + live HTTP targets, smooth auto-scroll, live exposure
- ✅ **Redline Watch** — monitoring dashboard, sparklines, regression alert, CI snippet
- ✅ **Benchmark** — State of AI Agent Security 2026 (build-pattern archetypes, A–F), **fed by real audits** you submit ("Add to benchmark" → "Your audits")
- ✅ **Audit your own bot** — paste a system prompt, connect a public GitHub repo (`/api/extract-prompt` finds the prompt), or an HTTP endpoint; all run the real battery live
- ✅ **Exa real-world recon** — co-equal first stage; searches the live web for the target company, OpenAI distills it (Structured Outputs) into real competitors + data types it then attacks with
- ✅ **Four-model engine** — Exa recon → OpenAI reasoning attacker → target → separate Structured-Outputs judge, shown as a landing pipeline ribbon
- ✅ **Self-driving voiced guided demo** — spotlight + cursor + human narration, cross-route choreography, runs a live FoxDesk audit; built to be screen-recorded
- ✅ **FoxDesk** — a real owned bot, audited as a live black box; certified clean (0/20), captured fixture for deterministic replay
- ✅ **"Built to a standard"** landing section
- ✅ Accurate standards mapping — OWASP (all) + PDPA (data) + MAS (proposed, FI-only), text badges + non-affiliation disclaimer
- ✅ Honesty layer — independent control bot, reachability guard, varied transcripts
- ✅ Responsible disclosure (PII redaction), saved reports, custom targets
- ✅ TypeScript strict throughout; production build passes; deployed on Vercel

**Known gaps / tradeoffs (intentional for an MVP):**
- No backend database — reports are localStorage-only, single-device
- Watch and Benchmark run on seeded/representative data, not a live fleet yet
- No authentication / multi-user; no automated tests; ESLint not configured
- External HTTP targets always run live (no fixtures); adaptive runs are LLM-paced

## Summary

Redline is a **polished, technically credible MVP for a safety platform around AI agents**: a 20-attack battery plus a genuine adaptive multi-turn agent, a **four-model adversarial pipeline** (Exa recon → attacker → target → separate judge), a dollar-exposure model, a find→fix→prove loop, continuous monitoring (Watch), a public benchmark, accurate OWASP/PDPA/MAS mapping, and an honesty layer (two independent controls incl. a real owned bot, reachability guard, varied transcripts) — wrapped in a premium editorial UI with a **self-driving voiced guided demo** for the pitch. Demo mode gives a bulletproof, network-free stage run; live mode audits any OpenAI-compatible provider or external HTTP bot. The arc is the pitch: **find it, fix it, prove it, watch it.**
