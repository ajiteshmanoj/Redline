# Redline — Session Log

> Auto-maintained. A **Stop hook** (`.claude/settings.local.json`) appends each new
> git commit below as Claude works. Edit the summary by hand anytime.

## What this is
**Redline** — an adversarial AI security platform that red-teams customer-facing chatbots:
a static 20-attack battery + an **adaptive multi-turn agent** (gpt-5.5 reasoning, target
recon + tailored attacks) with a gpt-5.4 judge (Structured Outputs), mapped to the OWASP
LLM Top 10 and MAS/PDPA. Live audits + a bulletproof `DEMO_MODE` (captured fixtures, zero
network). Light editorial UI.

## Links
- **Live:** https://redline-woad.vercel.app  (DEMO_MODE, zero-network)
- **Repo:** https://github.com/ajiteshmanoj/Redline
- Built for: 'Sup Build2026 Hackathon (Singapore · OpenAI-sponsored)

## Highlights built this session
- Adaptive multi-turn agent + per-target recon ("profile the bot, then tailor attacks").
- Role-differentiated OpenAI models (attacker gpt-5.5 · judge gpt-5.4 + Structured Outputs
  · target gpt-4.1-mini), with reasoning-model compatibility in the provider layer.
- Observability: live `live · {model}` vs `demo · captured fixtures` badges, per-result
  LLM-judge reasons, "AI in this run" roster.
- Reachability guard (errored probes can't read as a pass), concise 1-page PDF reports.
- Full visual redesign: light editorial system, Fraunces serif, artistic redline-breach
  logo + favicon, scroll-collapsing floating nav, cohesive all-light layout.

## Commit log
<!-- New commits are appended below automatically on each Stop. -->
- 2026-06-24 13:37 · Redline — adversarial AI security platform (07f0f58)
- 2026-06-24 16:11 · Artistic logo: redline signal breaching a threshold + matching favicon (24e4620)
- 2026-06-24 17:09 · Smooth light→dark transition into the closing CTA band (e299aa5)
- 2026-06-24 17:19 · Drop the dark closing band — cohesive light editorial throughout (b483638)
- 2026-06-24 17:23 · Make footer wordmark prominent (bolder, higher contrast) (0dad80d)
- 2026-06-25 00:03 · Nav: collapse into a translucent floating pill on scroll (639cec7)
- 2026-06-26 13:13 · Add auto-maintained SESSION_LOG.md + Stop-hook (local) to append commits (61e3972)
- 2026-06-26 14:30 · Add fundability features: fix-loop climax, $ exposure, Watch, Benchmark (dc70227)
- 2026-06-26 15:06 · Fixtures: vary HELD demo responses so transcripts read like a real bot (cce0895)
