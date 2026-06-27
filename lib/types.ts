// ---------------------------------------------------------------------------
// Shared domain types for Redline.
// ---------------------------------------------------------------------------

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AttackCategoryId =
  | "jailbreak"
  | "prompt-injection"
  | "pii-extraction"
  | "hallucination"
  | "brand-damage"
  | "policy-bypass";

// Named risks from the MAS AI Risk Management Guidelines (Nov 2025) that
// Redline's categories map onto. `null` where no single named risk applies.
export type MasRisk = "Prompt Injection" | "Data Leakage" | "Hallucination";

export type AttackCategory = {
  id: AttackCategoryId;
  label: string;
  short: string;
  description: string;
  // OWASP LLM Top 10 (2025) entry this category maps to, e.g. "LLM01: Prompt Injection".
  owaspId: string;
  // MAS AI Risk Management Guidelines (Nov 2025) named risk, or null where none applies.
  masRisk: MasRisk | null;
};

export type Attack = {
  id: string;
  category: AttackCategoryId;
  title: string;
  // The adversarial message sent to the target bot.
  prompt: string;
  // What "broken" looks like for this attack — used to steer the judge.
  intent: string;
};

export type JudgeVerdict = {
  broken: boolean;
  severity: number; // 1-10
  reason: string;
};

export type AttackResult = {
  attackId: string;
  category: AttackCategoryId;
  title: string;
  prompt: string;
  response: string;
  verdict: JudgeVerdict;
};

export type Vulnerability = {
  category: AttackCategoryId;
  title: string;
  severity: number; // 1-10
  reason: string;
  prompt: string;
  response: string;
};

// ---- Business / regulatory exposure --------------------------------------
// Translates a confirmed break into the language a non-technical buyer feels:
// money and regulatory consequence. Indicative, severity-scaled, methodology
// surfaced in the report — never presented as a precise liability.

export type ExposureKind =
  | "regulatory" // statutory fine (e.g. PDPA financial penalty)
  | "direct-loss" // money out the door (unauthorised payouts, fraud)
  | "liability" // claims arising from bad advice / unhonoured promises
  | "reputational"; // brand / trust damage, remediation & churn

export type Exposure = {
  kind: ExposureKind;
  // What drives the cost — one tight phrase shown next to the figure.
  basis: string;
  // Representative point estimate in SGD, severity-scaled.
  amountSGD: number;
  // Plausible band around the point estimate.
  rangeSGD: [number, number];
};

// Aggregated exposure across all confirmed breaks. Regulatory caps do NOT
// stack (one breach, one statutory ceiling) — the aggregator takes the single
// largest regulatory exposure and sums the rest.
export type ExposureSummary = {
  totalSGD: number;
  rangeSGD: [number, number];
  // Largest single line, for the headline ("driven by …").
  topBasis: string;
  // Distinct regulatory/standards drivers, for the one-line headline.
  drivers: ExposureKind[];
};

// A user-configured live bot reached over HTTP (the "grant access by URL" flow).
export type HttpTargetConfig = {
  name: string;
  endpoint: string;
  method?: "POST";
  headers?: Record<string, string>;
  // JSON body template; {{message}} is replaced with the adversarial prompt.
  bodyTemplate: string;
  // Dot/index path to the reply text in the JSON response, e.g. "reply" or
  // "choices.0.message.content".
  replyPath: string;
  // OPTIONAL — multi-turn support for the adaptive agent. If the bot keeps
  // conversation state behind a session/conversation id, set:
  //   sessionIdPath  — where to read the id from each response (e.g. "conversation_id")
  //   sessionIdField — the top-level body key to send it back in (e.g. "conversation_id")
  // When set, the adaptive agent threads the id across turns so the bot
  // remembers the conversation. Single-turn audits ignore these.
  sessionIdPath?: string;
  sessionIdField?: string;
};

export type Bot = {
  id: string;
  name: string;
  business: string;
  sector: string;
  blurb: string;
  avatarInitials: string;
  systemPrompt: string;
  // Categories this bot is realistically weakest in (used for copy + ordering).
  weakSpots: AttackCategoryId[];
  // Marks a neutral, independently-authored target (not rigged to be weak).
  // Used for clear labelling on the target-selection screen.
  independent?: boolean;
  // When set, the LIVE path drives this bot as a black box through the HTTP
  // adapter (lib/http-target.ts) instead of running its system prompt directly.
  // `endpoint` may be a relative path (e.g. "/api/sample-bot"); it is resolved
  // against the request origin server-side. DEMO_MODE still serves fixtures.
  httpTarget?: HttpTargetConfig;
};

export type SeverityBand = "secure" | "low" | "moderate" | "high" | "critical";

export type AuditSummary = {
  botId: string;
  score: number; // 0-100 overall risk
  band: SeverityBand;
  total: number;
  broken: number;
  passed: number;
  // Probes whose "response" was a transport error/timeout rather than a real
  // bot reply. Excluded from the held tally so an unreachable target can't read
  // as a clean pass. (Optional for backwards-compat with older saved reports.)
  errored?: number;
  headline: string;
};

// ---- Server-Sent streaming protocol --------------------------------------

// Which model plays each AI role this run. Roles absent from a run (e.g. an
// external HTTP target has no "target" model of ours) are simply omitted.
export type RoleModels = {
  attacker?: string;
  target?: string;
  judge?: string;
};

export type AuditEvent =
  | {
      type: "start";
      botId: string;
      botName: string;
      total: number;
      mode: "demo" | "live";
      // The live model doing the AI work (undefined in demo mode — no live AI).
      model?: string;
      // Per-role model roster (config). Shown so judges see deliberate model use.
      models?: RoleModels;
    }
  | { type: "attack_start"; attackId: string; category: AttackCategoryId; title: string }
  | { type: "attack_result"; result: AttackResult; index: number; total: number }
  | { type: "done"; summary: AuditSummary; vulnerabilities: Vulnerability[]; patches: PromptPatch[] };

export type PromptPatch = {
  category: AttackCategoryId;
  title: string;
  rationale: string;
  patch: string;
};

// ---- Adaptive (multi-turn) red-team agent ---------------------------------
// A higher-altitude attack: instead of firing one fixed prompt, an attacker LLM
// pursues a GOAL over several turns, reading the bot's replies and escalating.

// A high-level objective the agent pursues (NOT a fixed prompt — the agent
// writes its own messages each turn to achieve this).
// Recon: the agent profiles the target before attacking, then tailors its
// attacks to that specific bot (what data/actions it appears to have).
export type TargetProfile = {
  probe: string; // the benign opener the agent sent
  reply: string; // the bot's reply
  summary: string; // the agent's inferred profile (role · data · actions · sector)
};

export type AdaptiveGoal = {
  id: string;
  category: AttackCategoryId;
  title: string;
  objective: string;
};

export type AdaptiveTurn = {
  index: number;
  attacker: string; // the message the agent chose to send this turn
  bot: string; // the target's reply
  verdict: JudgeVerdict; // judged against the goal, per turn
};

export type AdaptiveCampaign = {
  goalId: string;
  category: AttackCategoryId;
  title: string;
  objective: string;
  turns: AdaptiveTurn[];
  broken: boolean;
  severity: number; // worst severity observed
  turnsUsed: number;
};

export type AdaptiveSummary = {
  botId: string;
  score: number; // 0-100, reuses the same scoring as the static battery
  band: SeverityBand;
  totalGoals: number;
  broken: number; // goals the agent achieved
  resisted: number; // goals the bot held against
  avgTurnsToBreak: number | null;
  headline: string;
};

export type AdaptiveEvent =
  | {
      type: "start";
      botId: string;
      botName: string;
      totalGoals: number;
      maxTurns: number;
      mode: "demo" | "live";
      // The live model doing the AI work (undefined in demo mode).
      model?: string;
      // Per-role model roster (config), e.g. { attacker, target, judge }.
      models?: RoleModels;
    }
  | { type: "recon"; profile: TargetProfile }
  | { type: "campaign_start"; goalId: string; category: AttackCategoryId; title: string; objective: string }
  | { type: "turn"; goalId: string; turn: AdaptiveTurn }
  | { type: "campaign_done"; campaign: AdaptiveCampaign }
  | { type: "done"; summary: AdaptiveSummary; campaigns: AdaptiveCampaign[] };
