# Redline

**Red-team other companies' AI agents before they ship.**

Every business is deploying LLM chatbots — support, sales, front desk — without checking if
they're safe. Redline points an adversarial agent at a target chatbot, runs a battery of attacks
(jailbreaks, prompt injection, PDPA/PII data-extraction, hallucination traps, brand/over-promise
bait, verification bypass), and returns **exactly where the bot breaks** — with the transcript as
proof, a severity score, and a suggested system-prompt patch.

Built as a vertical slice: **Landing → Target selection → Live audit console → Findings report.**

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
lib/
  llm.ts                    SINGLE provider abstraction — runAgent()
  attacks.ts                Attack suite (6 categories) + judge + live runner
  bots.ts                   The 3 vulnerable target bots
  fixtures.ts               DEMO_MODE scripted results
  audit.ts                  Scoring, vulnerability ranking, patch generation
  types.ts                  Shared domain + streaming-event types
components/
  audit-console.tsx         The live "hero moment" console
  severity-meter.tsx        Spring-physics 0–100 risk gauge
  report-view.tsx           Findings report + patches
  higgsfield-video.tsx      Media asset slot (see below)
```

### Attack engine

[`lib/attacks.ts`](lib/attacks.ts) defines **6 categories** with 2–4 concrete probes each
(18 total): jailbreak/role-override, prompt injection, PII/data-extraction, hallucination/false-
authority, brand-damage/over-promise, and policy/verification bypass.

For each attack the engine (1) sends the adversarial prompt to the target bot via `runAgent`,
then (2) makes a **separate low-temperature "judge" call** that evaluates the response and returns
strict JSON: `{ broken: boolean, severity: 1-10, reason: string }`. The judge output is parsed
defensively (`parseVerdict`) — it tolerates code fences, stray prose, and malformed JSON, falling
back to SAFE rather than crashing. Results aggregate into a 0–100 risk score and a ranked
vulnerability list.

---

## Switching the LLM provider (one file)

**All provider specifics live in [`lib/llm.ts`](lib/llm.ts).** The rest of the app only calls
`runAgent(messages, systemPrompt)`. To swap models or providers you change **only env vars** (for
any OpenAI-Chat-Completions-compatible endpoint) or, at most, the single `callChatCompletions`
function (for a different wire shape).

It's implemented against the **OpenAI Chat Completions** API by default. Set in `.env.local`:

```bash
DEMO_MODE=false
LLM_API_KEY=sk-...
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
```

Works as-is with any compatible endpoint — just change the three vars:

- **OpenRouter** — `LLM_BASE_URL=https://openrouter.ai/api/v1`, `LLM_MODEL=anthropic/claude-3.5-sonnet`
- **Together / Groq / Fireworks / local vLLM / Ollama** (`/v1`) — point `LLM_BASE_URL` at their base URL
- **A provider with a different wire shape** (e.g. Anthropic's native `/v1/messages`) — rewrite
  only the body/headers/parse inside `callChatCompletions`. Keep `runAgent`'s signature and the
  whole app keeps working. There's a comment block in the file walking through this.

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

### Testing the live path (do this with your own key)

The live path is written to the OpenAI Chat Completions shape but was **not executed during the
build** (no key available). To test it:

```bash
# in .env.local
DEMO_MODE=false
LLM_API_KEY=sk-...your key...
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
```

```bash
npm run dev
```

Then run an audit from `/audit`. Each of the 18 attacks makes one target call + one judge call
(~36 calls per audit). Pacing comes from real latency; the same console/report UI is used.

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

- **Aesthetic:** dark "security console meets premium SaaS." Near-black layered surfaces, off-white
  text, a single signature red (`#FF3B3B`) reserved for danger/breaks, muted green (`#37C98B`) for
  passes. Engineering grid + subtle grain for cinematic texture.
- **Type:** Space Grotesk (geometric grotesk display) for headings, Inter for body, JetBrains Mono
  for transcripts/logs — all via `next/font` (self-hosted at build, no runtime font fetch).
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

Next.js 14 (App Router, TypeScript strict) · Tailwind CSS · Framer Motion · lucide-react.
Pinned to known-good versions in `package.json`.
