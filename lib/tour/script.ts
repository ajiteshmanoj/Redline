// ===========================================================================
// lib/tour/script.ts — the guided demo, as data (single source of truth).
//
// Each step points the spotlight at one element, scrolls it into view, and
// narrates one line. The narration text here is ALSO what the ElevenLabs
// generator (scripts/gen-narration.mjs) turns into public/tour/<id>.mp3, so the
// words on screen and the words spoken never drift.
//
// `target` resolves to an element on the current route:
//   - starts with # . or [  → used as a raw CSS selector
//   - otherwise              → matched as [data-tour="<target>"]
// `route` (optional) lets a step live on another page; the controller navigates
// there first (cross-route choreography — wired in a later phase).
// ===========================================================================

export type TourAction =
  // `when` controls timing: "enter" (default) fires at the step's start — e.g.
  // click a tab to reveal what we're about to narrate. "exit" fires after the
  // narration — e.g. click "Run" so the navigation lands as we move on.
  | { type: "click"; target: string; when?: "enter" | "exit" }
  | { type: "wait"; ms: number };

export type TourStep = {
  id: string;
  target: string;
  route?: string;
  /** Narration + on-screen subtitle. */
  say: string;
  /** Optional action performed when the step begins (e.g. start an audit). */
  action?: TourAction;
  /** Override the auto-computed fallback duration (ms) used when audio is absent. */
  holdMs?: number;
  /** How long to wait for the target to appear (default 9s). Long for live runs. */
  waitMs?: number;
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: "hero",
    target: "hero",
    say: "This is Redline. It red-teams the AI chatbots companies put in front of customers — and finds where they break before real users, or regulators, do.",
  },
  {
    id: "live-break",
    target: "live-break",
    say: "Here's the hero moment — a bot breaking, message by message. The attack, the bot's real reply, and a verdict, with the line that broke it lit red.",
  },
  {
    id: "pipeline",
    target: "pipeline",
    say: "Underneath, every audit runs four models in sequence. Exa scouts the live web for the company. An OpenAI reasoning model attacks. Your bot replies. And a separate model judges every answer.",
  },
  {
    id: "roles",
    target: "roles",
    say: "Here's why that's credible. The judge is its own model call — it sees only the bot's reply against a fixed rubric, and must return strict structured output: broken or safe, a severity, and a reason. It never sees the attacker's strategy, so it can't rubber-stamp the attacker's wins.",
  },
  {
    id: "standards",
    target: "standards",
    say: "And every finding cites a recognised standard — the OWASP LLM Top Ten, Singapore's PDPA, and the MAS AI guidelines — so a result isn't our opinion, it's a citation.",
  },
  {
    id: "attacks",
    target: "#attacks .grid",
    route: "/",
    say: "Those attacks span six categories — prompt injection, personal-data extraction, jailbreaks, policy bypass, and more — each firing several concrete probes.",
  },
  // ---- Live audit on a real bot we own (FoxDesk) ----
  {
    id: "foxdesk-open",
    route: "/audit/new",
    target: "mode-http",
    action: { type: "click", target: "mode-http", when: "enter" },
    say: "Now let's do it for real, on a live bot we own — FoxDesk, a tuition-centre assistant — by handing Redline its endpoint.",
  },
  {
    id: "foxdesk-config",
    route: "/audit/new",
    target: "foxdesk",
    say: "Redline treats it as a black box: it posts each attack straight to the live URL and reads the reply back, with no access to the prompt — exactly like an attacker would.",
  },
  {
    id: "foxdesk-run",
    route: "/audit/new",
    target: "run-audit",
    action: { type: "click", target: "run-audit", when: "exit" },
    say: "So let's fire the full battery at it — live, server-side, over the network.",
  },
  {
    id: "foxdesk-running",
    route: "/audit/custom",
    target: "[data-tour='result'], main",
    say: "Every probe hits the real FoxDesk endpoint, and the judge scores each reply the moment it lands — break or hold, in real time.",
  },
  {
    id: "foxdesk-report",
    route: "/audit/custom",
    target: "view-report",
    action: { type: "click", target: "view-report", when: "exit" },
    waitMs: 120000,
    say: "When it finishes, you get the report.",
  },
  {
    id: "report",
    route: "/audit/custom",
    target: "report",
    waitMs: 15000,
    say: "Here's the verdict on a real, deployed bot — a severity score, the dollar and PDPA exposure it carries, and every finding backed by the actual transcript.",
  },
  // ---- The rest of the platform ----
  {
    id: "watch",
    route: "/watch",
    target: "watch",
    say: "It doesn't stop at one audit. Redline Watch re-runs the battery on a schedule and tracks the score over time — so a model update or a prompt tweak that quietly reopens a hole trips a regression alert.",
  },
  {
    id: "benchmark",
    route: "/benchmark",
    target: "benchmark",
    say: "And the Benchmark grades the whole landscape — how the common ways teams build these bots hold up — turning every audit into industry data.",
  },
  {
    id: "closing",
    route: "/",
    target: "hero",
    say: "Find out where your AI breaks — before your customers, or your lawyers, do. That's Redline.",
  },
];

/** Resolve a step's `target` to a concrete CSS selector. */
export function targetSelector(target: string): string {
  return /^[#.\[]/.test(target) ? target : `[data-tour="${target}"]`;
}

/** Fallback narration duration (ms) when no audio clip exists yet. */
export function fallbackHoldMs(say: string): number {
  const words = say.trim().split(/\s+/).length;
  return Math.min(15000, Math.max(2800, Math.round((words / 2.6) * 1000)));
}
