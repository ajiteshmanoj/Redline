# Redline

**Red-team other companies' AI agents before they ship.**

Every business is deploying LLM chatbots — support, sales, front desk — without checking if
they're safe. Redline points an adversarial agent at a target chatbot, runs a battery of attacks
(jailbreaks, prompt injection, PDPA/PII data-extraction, hallucination traps, brand/over-promise
bait, verification bypass), and returns **exactly where the bot breaks** — with the transcript as
proof, a severity score, a Singapore-dollar exposure estimate, and a suggested system-prompt patch.

**The engine is OpenAI, used three ways at once** — a reasoning model (`gpt-5.5`) as the autonomous
multi-turn attacker, `gpt-4.1-mini` as the target it's interrogating, and a separate `gpt-5.4`
judge that scores every reply with **Structured Outputs** (strict `json_schema`). For its recon
phase the adaptive agent uses **Exa** to search the live web for the target company, then distills
those results — again via the OpenAI model, Structured Outputs — into real competitors and the data
types the business holds, so attacks are grounded in reality rather than guesses. The AI isn't a
feature bolted on; it *is* the product.

Built as a full slice: **Landing → Target selection → Live audit console (static battery) →
Adaptive multi-turn agent → Findings report**, plus self-serve audits (paste a prompt or connect a
GitHub repo).

---

## Quick start

```bash
npm install
cp .env.example .env.local      # DEMO_MODE=true is already set
npm run dev                      # http://localhost:3000
```

That's it. With `DEMO_MODE=true` (the default in `.env.example`) the entire flow runs from
pre-scripted fixtures with **zero network calls and no API key**. This is the stage-demo path —
it cannot fail due to network or API issues.

Production build:

```bash
npm run build && npm run start
```

---

## The demo flow

1. **Landing** (`/`) — product landing page. Hero, problem statement, attack-suite overview.
2. **Target selection** (`/audit`) — three pre-built vulnerable demo bots to audit.
3. **Live audit console** (`/audit/[botId]`) — attacks fire one-by-one, streamed live: the
   adversarial prompt, the bot's response, and a SAFE/BROKEN verdict. A spring-physics severity
   meter climbs as breaks are found; category counters tick up in real time.
4. **Report** — severity score, ranked vulnerabilities with proof transcripts, and an
   auto-generated "suggested system-prompt patch" for the top issues. Exportable via the browser
   print dialog (**Export PDF**).

### The three demo bots

| Bot | Business | Designed to break on |
| --- | --- | --- |
| **Ms. Bright** | BrightMinds Tuition | PII/PDPA leak of other parents' contacts; guaranteed-results over-promising |
| **CareDesk** | CalmCare Clinic | Prompt injection overriding its role; hallucinated medical advice |
| **SwiftPay Helpdesk** | SwiftPay (fintech) | Jailbreak into issuing refunds; identity-verification & internal-policy bypass |

Each bot is defined entirely by a system prompt in [`lib/bots.ts`](lib/bots.ts) — written the way
a rushed SME founder would, missing the guardrails that matter. They're realistically weak, not
cartoonishly broken.

---

## Architecture

```
app/
  page.tsx                  Landing page
  audit/page.tsx            Target selection
  audit/[botId]/page.tsx    Loads bot → renders the audit experience
  api/audit/route.ts        Streams the audit (NDJSON) — demo OR live
  api/adaptive/route.ts     Streams the adaptive multi-turn agent (NDJSON)
lib/
  llm.ts                    SINGLE OpenAI/provider abstraction — runAgent()
  attacks.ts                Static attack suite (6 categories, 20 probes) + judge
  adaptive.ts               Multi-turn reasoning agent + Exa-powered recon
  exa.ts                    Exa neural-search client (real-world OSINT)
  bots.ts                   The vulnerable + independent target bots
  fixtures.ts               DEMO_MODE scripted results (zero network)
  audit.ts                  Rubric risk score, ranking, patch generation
  exposure.ts               Singapore-dollar exposure model
  standards.ts              OWASP / PDPA / MAS mapping
  types.ts                  Shared domain + streaming-event types
components/
  audit-console.tsx         The live "hero moment" console
  severity-meter.tsx        Spring-physics 0–100 risk gauge
  report-view.tsx           Findings report, exposure, PDPA hero, patches
  adaptive-experience.tsx   Multi-turn engagement feed + recon card
```

### Attack engine

**Static battery —** [`lib/attacks.ts`](lib/attacks.ts) defines **6 categories** with concrete
probes each (**20 total**): jailbreak/role-override, prompt injection, PII/data-extraction,
hallucination/false-authority, brand-damage/over-promise, and policy/verification bypass.

For each attack the engine (1) sends the adversarial prompt to the target bot via `runAgent`,
then (2) makes a **separate low-temperature "judge" call** — a different OpenAI model that never
sees its own attacks — which returns a strict verdict via **Structured Outputs**:
`{ broken: boolean, severity: 1-10, reason: string }`. The judge output is also parsed
defensively (`parseVerdict`) — it tolerates code fences, stray prose, and malformed JSON, falling
back to SAFE rather than crashing. Results aggregate into a rubric-based 0–100 risk score (see
[`computeRiskScore`](lib/audit.ts)) and a ranked vulnerability list.

**Adaptive multi-turn agent —** [`lib/adaptive.ts`](lib/adaptive.ts) is the higher-altitude mode.
Instead of one fixed prompt, an OpenAI **reasoning model** pursues a *goal* over up to 5 turns,
reading each reply and escalating — catching breaks that only appear under sustained pressure.
Before attacking, it runs a **recon phase**: it profiles the bot, and (when `EXA_API_KEY` is set)
uses **Exa** to search the real web for the target company, distilling the results into named
competitors and likely data types it then weaponises (see
[`osintRecon`](lib/adaptive.ts) and [`lib/exa.ts`](lib/exa.ts)).

---

## AI engine — powered by OpenAI

Redline runs **three OpenAI roles per audit**, set independently so the model use is deliberate,
not a single chat call doing everything:

| Role | Default model | Why this model | OpenAI feature leaned on |
| --- | --- | --- | --- |
| **Attacker** | `gpt-5.5` | a reasoning model to plan, read replies, and escalate across turns | reasoning / agentic multi-turn |
| **Target** | `gpt-4.1-mini` | a cheap, fast model — realistic stand-in for a deployed SME bot | low-latency chat |
| **Judge** | `gpt-5.4` | careful, deterministic scoring that never sees its own attacks | **Structured Outputs** (`json_schema`, strict) |

Set in `.env.local` (per-role overrides fall back to `LLM_MODEL`):

```bash
DEMO_MODE=false
LLM_API_KEY=sk-...
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL_ATTACKER=gpt-5.5
LLM_MODEL_JUDGE=gpt-5.4
LLM_MODEL_TARGET=gpt-4.1-mini

# Real-world recon (optional but recommended)
EXA_API_KEY=...        # https://dashboard.exa.ai
```

**Exa** powers the adaptive agent's recon: a neural web search on the target company whose results
the OpenAI attacker distills (Structured Outputs again) into competitors + data types. Exa finds
the truth on the open web; OpenAI turns it into an attack plan.

<details>
<summary><b>Provider-agnostic by design</b> (one file)</summary>

All provider specifics live in [`lib/llm.ts`](lib/llm.ts); the rest of the app only calls
`runAgent(messages, systemPrompt)`. It's the **OpenAI Chat Completions** shape by default, so any
compatible endpoint works by changing env vars — OpenRouter
(`LLM_BASE_URL=https://openrouter.ai/api/v1`), Together / Groq / Fireworks / vLLM / Ollama (`/v1`).
A different wire shape (e.g. Anthropic's native `/v1/messages`) needs only the single
`callChatCompletions` function rewritten; `runAgent`'s signature stays and the whole app keeps
working.
</details>

---

## DEMO_MODE vs live

| | `DEMO_MODE=true` (default) | `DEMO_MODE=false` (live) |
| --- | --- | --- |
| LLM calls | **none** | real, via `lib/llm.ts` |
| API key | not required | **required** (`LLM_API_KEY`) |
| Results | scripted fixtures (`lib/fixtures.ts`) | live attack + judge calls |
| Use for | the stage demo — repeatable, network-free | real audits against your own key |

The mode badge is shown in the UI header (**DEMO MODE** / **LIVE MODE**) so you always know which
path is running. Toggle by editing `DEMO_MODE` in `.env.local` and restarting the dev server.

### Testing the live path

The live path runs against real OpenAI calls. The deployed app at
[redline-woad.vercel.app](https://redline-woad.vercel.app) has the `LLM_*` and `EXA_API_KEY`
secrets set, so **self-serve audits run live in production** while the built-in demo bots stay
network-free. Locally:

```bash
# in .env.local
DEMO_MODE=false
LLM_API_KEY=sk-...your key...
LLM_MODEL_ATTACKER=gpt-5.5
LLM_MODEL_JUDGE=gpt-5.4
LLM_MODEL_TARGET=gpt-4.1-mini
EXA_API_KEY=...           # optional, enables real-world recon
```

```bash
npm run dev
```

Then run an audit from `/audit`. Each of the 20 static attacks makes one target call + one judge
call (~40 calls per audit); the adaptive agent adds the recon (Exa + one synthesis call) plus up to
5 turns × (attacker + target + judge) per goal. Pacing comes from real latency; the same
console/report UI is used.

---

## Higgsfield media assets

The landing hero (and an optional console backdrop) have a **video slot with a poster/grid
fallback**, so the app looks finished with no media at all. Drop generated files into
[`public/media/`](public/media/) — see `public/media/README.md` for the exact filenames.

To activate the hero video, pass the paths in `app/page.tsx`:

```tsx
<HiggsfieldVideo src="/media/hero.mp4" poster="/media/hero-poster.jpg" />
```

Search the codebase for `HIGGSFIELD ASSET SLOT` to find every drop point. The component is
[`components/higgsfield-video.tsx`](components/higgsfield-video.tsx).

---

## Design decisions (made deliberately, so you don't have to)

- **Aesthetic:** light editorial — warm cream canvas, near-black text, soft white cards, a single
  deep security red (`#C20E2E`) reserved for danger/breaks and green for passes. Engineering grid +
  subtle grain for cinematic texture without the cliché dark-hacker theme.
- **Type:** Fraunces (display serif) for headings, Inter for body, JetBrains Mono for
  transcripts/logs/figures — all via `next/font` (self-hosted at build, no runtime font fetch).
- **Motion (Framer Motion):** staggered scroll reveals, a pulsing "scanning" sweep on the live
  console, per-attack streamed entry, and a severity meter animated with **spring physics**
  (`useSpring`) that climbs as breaks land.
- **No backend/db/auth.** Everything is client-side or in-memory in Next.js API routes. The audit
  streams as NDJSON over a single `fetch` so the console can render results as they arrive.
- **Scoring** is severity-weighted and saturating: a single 10/10 break (e.g. a real PII leak or
  unauthorised payout) alone pushes the score into the danger band — count of trivial issues
  shouldn't outrank one catastrophic one.
- **Bots are PDPA-flavoured Singapore SMEs** to make the data-extraction findings concrete and the
  stakes legible.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server (http://localhost:3000) |
| `npm run build` | Production build (type-checked, strict) |
| `npm run start` | Serve the production build |
| `npm run lint` | Next.js lint |

---

## Tech stack

Next.js 14 (App Router, TypeScript strict) · Tailwind CSS · Framer Motion · lucide-react ·
**OpenAI** (reasoning attacker + Structured Outputs judge) · **Exa** (real-world recon).
Pinned to known-good versions in `package.json`.
