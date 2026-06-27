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
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: "hero",
    target: "hero",
    say: "This is Redline. It red-teams the customer-facing AI chatbots that companies are shipping — finding where they break before real users, or regulators, do.",
  },
  {
    id: "live-break",
    target: "live-break",
    say: "Here's the hero moment — a bot breaking, exchange by exchange. You see the adversarial prompt, the bot's real reply, and a verdict, with the line that broke it lit red.",
  },
  {
    id: "pipeline",
    target: "pipeline",
    say: "What's underneath isn't one model talking to itself. Every audit runs four distinct models in sequence. Exa scouts the live web for the target company. An OpenAI reasoning model attacks. Your bot replies. And a separate model — the judge — scores every reply with structured outputs.",
  },
  {
    id: "roles",
    target: "roles",
    say: "Separating the attacker from the judge is what makes the verdict credible — the attacker never grades its own homework.",
  },
  {
    id: "standards",
    target: "standards",
    say: "And every finding is mapped to a recognised standard — the OWASP LLM Top Ten, Singapore's PDPA, and the MAS AI guidelines — so a result isn't Redline's opinion, it's a citation.",
  },
  // ---- Live audit on a real bot we own (FoxDesk) ----
  {
    id: "foxdesk-open",
    route: "/audit/new",
    target: "mode-http",
    action: { type: "click", target: "mode-http", when: "enter" },
    say: "Now let's point it at a real, deployed bot we own — FoxDesk, a live tuition-centre assistant — by handing Redline its HTTP endpoint.",
  },
  {
    id: "foxdesk-config",
    route: "/audit/new",
    target: "foxdesk",
    say: "Redline drives FoxDesk as a black box: it posts each attack to the live endpoint and reads the reply straight back, with no access to the prompt — exactly like a real attacker.",
  },
  {
    id: "foxdesk-run",
    route: "/audit/new",
    target: "run-audit",
    action: { type: "click", target: "run-audit", when: "exit" },
    say: "We fire the full battery at it — live, server-side, over the network.",
  },
  {
    id: "foxdesk-result",
    route: "/audit/custom",
    target: "[data-tour='result'], main",
    say: "And here's the verdict on a real, deployed bot — every probe, the breaks, a severity score, the dollar and PDPA exposure, and the full transcript as proof.",
    holdMs: 10000,
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
