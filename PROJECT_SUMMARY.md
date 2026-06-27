# Redline — Project Summary

> An adversarial AI security platform that red-teams customer-facing chatbots before they ship.

## What It Is

**Redline** points an adversarial agent at a target LLM chatbot, runs a battery of **20 attacks across 6 categories** (and an **adaptive multi-turn agent**), and shows exactly where the bot breaks — with proof transcripts, a 0–100 severity score, recommended system-prompt patches, and a mapping of every finding to the **OWASP LLM Top 10** and the **MAS AI Risk Management Guidelines (Nov 2025)**.

**The problem:** Businesses ship LLM chatbots (support, sales, front desk) without checking if they're safe — exposing them to jailbreaks, prompt injection, PII/PDPA leaks, hallucinations, over-promising, and policy bypass.

**The deliverable:** A complete, polished vertical slice — landing → target selection → live audit console → findings report → adaptive engagement — with responsible-disclosure tooling, compliance-legible standards mapping, and a premium editorial UI.

## Tech Stack

| Layer | Choices |
|-------|---------|
| Framework | Next.js 14 (App Router, TypeScript strict mode) |
| UI | React 18, Tailwind CSS 3.4, Framer Motion 11, Lucide icons |
| Type / motion | **Fraunces** editorial serif (display), Inter (body), JetBrains Mono (transcripts); CSS + Framer animations |
| Backend | Next.js API routes (Node runtime): `/api/audit`, `/api/adaptive`, `/api/probe`, `/api/sample-bot` |
| LLM | Provider-agnostic abstraction (`lib/llm.ts`); default OpenAI `gpt-4o-mini`; any OpenAI-compatible endpoint |
| Storage | Browser `localStorage` (no backend database) |
| Deploy | Vercel; `.env.production` pins `DEMO_MODE=true` for a network-free public demo |

## Design language (redesigned)

A **light, editorial, security-edge** aesthetic (inspired by supcareer.app's smoothness, kept original):
- Warm cream canvas, near-black text, soft white cards, a single serious **deep-red** accent (`#C20E2E`).
- **Fraunces serif** display headings with italic deep-red accent phrases; pill buttons; soft-shadow panels; generous spacing; scroll-reveal motion.
- **Signature hero:** a two-column layout with an auto-playing **live interrogation** — the adversarial agent types an attack, the bot replies, and a verdict slams in (`Broken · sev` red / `Held · safe` green), looping through real rounds (incl. one that holds, so it reads honest).
- **Living backgrounds:** an animated dot-matrix with a drifting red "scanner" spotlight (`DotField`), varied section treatments (faint grid, soft radials, a tinted band), and a dramatic **dark closing band + oversized wordmark** footer.

## Architecture

```
app/         Pages + API routes
components/   UI, audit/console/report, adaptive experience, fx, landing
  fx/          dot-field (animated scan), magnetic, tilt, marquee, count-up, typewriter
  landing/     interrogation (hero showcase), hero-console
lib/          Attack engine, adaptive agent, LLM provider, scoring, bots, fixtures, disclosure
```

Logic in `lib/`, UI in `components/`, routing in `app/`. Every LLM call flows through a single `runAgent()`.

## Targets

**Three rigged demo bots** (Singapore SME scenarios, deliberately weak): **Ms. Bright** (tuition, PII/over-promise), **CareDesk** (clinic, injection/hallucination), **SwiftPay** (fintech, jailbreak/policy).

**One independent control bot** — **Northwind Support** (`/api/sample-bot`): a plain, standard small-business assistant, **not rigged**, audited as a live black box over HTTP. Its fixtures were captured from a real live run: it held 19/20 single-shot (and all 5 adaptive campaigns) — proof Redline finds real differences and doesn't fake demos.

## Core Features

### Static battery (`/audit/[botId]`)
Real-time streaming console (NDJSON) of 20 probes — adversarial prompt, live bot response, SAFE/BROKEN verdict, spring-physics severity meter, per-category counters. A separate low-temperature **judge** call returns strict JSON `{ broken, severity, reason }` (heuristic fallback without a key). Findings report: severity ring, ranked vulnerabilities with **OWASP + MAS tags**, suggested patches, a **Regulatory context** block, and "prove the fix" hardened re-audit.

### Adaptive multi-turn agent (`/api/adaptive`, `/audit/[botId]/adaptive`)
The higher-altitude attack: an **attacker LLM pursues a goal over up to 5 turns**, reading each reply and escalating, judged per turn, stopping on a break. Works against built-in bots (native multi-turn) **and external HTTP bots** via session/conversation-id threading (`HttpTargetConfig.sessionIdPath`/`sessionIdField`; FoxDesk preset wired for `conversation_id`). Captured fixtures: brightminds breaks **2/5** (incl. a 3-turn medical-advice escalation single-shot missed); Northwind holds **5/5**.

### Target-reachability guard
`isTransportError()` detects `[target error/unreachable/returned …]` responses. Errored probes are **excluded from the held tally and the score** (`scoreResults` skips them), surfaced as an amber "Unreachable" chip + warning banner in the report and a count in the console — so a dead endpoint can never masquerade as a clean pass.

### Reporting & disclosure
- **Static report**: print-to-PDF (includes OWASP/MAS + regulatory block), save to localStorage, copy link, good-faith disclosure (PII auto-redacted).
- **Adaptive report**: a **concise 1-page PDF** — summary, one-line-per-campaign with standards tags, and proof of the breaking exchange only (not a full transcript dump).
- **Saved reports** (`/reports`), **custom live target** (`/audit/new` → `/audit/custom`, static or adaptive) with presets (FoxDesk, OpenAI-compatible, generic JSON) and a "Test connection" probe.

### Demo vs. Live
- **Demo** (`DEMO_MODE=true`, default): pre-scripted/captured fixtures, **zero network calls**, repeatable. Built-in bots only.
- **Live**: real LLM calls; external HTTP targets always run live (ignore DEMO_MODE).

## Data Model

No database. Types in `lib/types.ts`: `Attack`, `AttackCategory` (+ `owaspId`, `masRisk`), `AttackResult`, `JudgeVerdict`, `Vulnerability`, `Bot` (+ `independent`, `httpTarget`), `AuditSummary` (+ optional `errored`), `HttpTargetConfig` (+ optional `sessionIdPath`/`sessionIdField`), `MasRisk`, and the adaptive set (`AdaptiveGoal`, `AdaptiveTurn`, `AdaptiveCampaign`, `AdaptiveSummary`, `AdaptiveEvent`). Severity bands: secure (0–14), low (15–34), moderate (35–59), high (60–79), critical (80+).

## Build & Run

```bash
npm install        # first time
npm run dev        # http://localhost:3000 (demo mode by default)
npm run build      # type-checked production build (17 routes, passes)
npm run start
```

Env: `DEMO_MODE`, `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`.

> ESLint isn't configured in this project; `npm run build` runs the authoritative TypeScript strict type-check and passes.

## Current State

**Working & verified:**
- ✅ 20-attack static battery (frozen suite) + judge, across 6 categories
- ✅ Adaptive multi-turn agent — built-in bots and live HTTP targets (session-threaded); captured demo fixtures
- ✅ Independent control bot (`/api/sample-bot`) + genuine captured results
- ✅ OWASP LLM Top 10 + MAS mapping (report, summary, PDF)
- ✅ Target-reachability guard (errors can't read as a pass)
- ✅ Concise adaptive PDF + static report PDF
- ✅ Full visual redesign: light editorial system, live-interrogation hero, animated scan field, varied backgrounds, dark footer
- ✅ Responsible disclosure (PII redaction), saved reports, custom targets
- ✅ TypeScript strict throughout; `npm run build` passes (17 routes)

**Known gaps / tradeoffs (intentional for an MVP):**
- No backend database — reports are localStorage-only, single-device
- No authentication / multi-user; no automated tests; ESLint not configured
- External HTTP targets always run live (no fixtures)
- Adaptive runs are LLM-paced (slower; results vary run-to-run in live mode)

## Summary

Redline is a **polished, technically credible MVP** for adversarial AI security: a frozen 20-attack battery plus a genuine **adaptive multi-turn agent** that works on live bots, OWASP/MAS-mapped reporting, an honesty layer (independent control bot + reachability guard), and a premium, original UI that sells the experience. Demo mode gives a bulletproof, network-free stage run; live mode audits any OpenAI-compatible provider or external HTTP bot. No tests, backend, or auth — deliberate tradeoffs for a strong vertical slice.
