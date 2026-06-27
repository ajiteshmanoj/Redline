// ===========================================================================
// lib/llm.ts — single provider-abstraction module.
//
// Everything provider-specific lives in THIS FILE. To swap models or
// providers, you only edit here. The rest of Redline calls `runAgent()`.
//
// ---------------------------------------------------------------------------
// HOW TO SWITCH PROVIDERS
// ---------------------------------------------------------------------------
// Redline talks to any endpoint that speaks the OpenAI Chat Completions API
// shape (POST {base}/chat/completions with { model, messages }). That covers a
// huge range of providers out of the box — you only change env vars:
//
//   • OpenAI (default)
//       LLM_BASE_URL=https://api.openai.com/v1
//       LLM_MODEL=gpt-4o-mini
//       LLM_API_KEY=sk-...
//
//   • Azure OpenAI / OpenRouter / Together / Groq / Fireworks / local vLLM /
//     Ollama (with its OpenAI-compatible /v1 endpoint), etc.
//       LLM_BASE_URL=https://openrouter.ai/api/v1
//       LLM_MODEL=anthropic/claude-3.5-sonnet
//       LLM_API_KEY=...
//
//   • A provider with a DIFFERENT wire shape (e.g. Anthropic's native
//     /v1/messages): replace the body/headers/parse inside `callChatCompletions`
//     below. That is the ONLY function you need to rewrite. Keep the exported
//     `runAgent` signature identical and the whole app keeps working.
//
// ---------------------------------------------------------------------------
// DEMO_MODE
// ---------------------------------------------------------------------------
// When DEMO_MODE=true, the audit route never calls this file at all — it serves
// pre-scripted fixtures (see lib/fixtures.ts). This module is only exercised on
// the live path, which requires a real LLM_API_KEY.
// ===========================================================================

import type { ChatMessage } from "./types";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";

export type RunAgentOptions = {
  /** Lower = more deterministic. Judge calls use a low temperature. */
  temperature?: number;
  /** Ask the provider to emit a JSON object (used by the judge). */
  json?: boolean;
  /** Strict Structured Output: { name, schema } → response_format json_schema. */
  jsonSchema?: { name: string; schema: Record<string, unknown> };
  maxTokens?: number;
  /** Abort the request after this many ms (default 45s). */
  timeoutMs?: number;
  /** Which AI role this call plays — selects a per-role model (see modelFor). */
  role?: AgentRole;
};

export type AgentRole = "attacker" | "judge" | "target";

/**
 * The single entry point the rest of the app uses to talk to an LLM.
 *
 * @param messages       Prior turns (user/assistant). System prompt is separate.
 * @param systemPrompt   The system prompt prepended for this call.
 * @returns              The assistant's text content.
 */
export async function runAgent(
  messages: ChatMessage[],
  systemPrompt: string,
  options: RunAgentOptions = {},
): Promise<string> {
  const fullMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];
  return callChatCompletions(fullMessages, options);
}

// ---------------------------------------------------------------------------
// Provider call — the ONLY function tied to a specific wire format.
// Implemented against the OpenAI Chat Completions shape.
// ---------------------------------------------------------------------------
async function callChatCompletions(
  messages: ChatMessage[],
  options: RunAgentOptions,
): Promise<string> {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = (process.env.LLM_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const model = modelFor(options.role);

  if (!apiKey) {
    throw new Error(
      "LLM_API_KEY is not set. Set it in .env.local for the live path, or run with DEMO_MODE=true.",
    );
  }

  const responseFormat = options.jsonSchema
    ? {
        type: "json_schema",
        json_schema: { name: options.jsonSchema.name, strict: true, schema: options.jsonSchema.schema },
      }
    : options.json
      ? { type: "json_object" }
      : undefined;

  // Reasoning models (gpt-5.x, o-series) take a different shape: no `temperature`,
  // `max_completion_tokens` instead of `max_tokens`, and they spend hidden
  // reasoning tokens that count toward the limit — so they need ample headroom
  // or they return EMPTY content. They stop when done, so the larger ceiling
  // adds no latency when reasoning is short. (Provider-layer only — the attack
  // files' token budgets are untouched.)
  const isReasoning = /^(o\d|gpt-5)/i.test(model);

  // Hard timeout so a hung provider call can never stall a live audit / the
  // adaptive loop. Reasoning models are slow — especially the cold first call —
  // so give them a generous window before aborting.
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? (isReasoning ? 120000 : 45000),
  );

  const post = (body: Record<string, unknown>) =>
    fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store", // never cache adversarial probes
    });

  const standardBody: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 600,
    ...(responseFormat ? { response_format: responseFormat } : {}),
  };
  const reasoningBody: Record<string, unknown> = {
    model,
    messages,
    max_completion_tokens: Math.max(options.maxTokens ?? 600, 4096),
    ...(responseFormat ? { response_format: responseFormat } : {}),
  };

  try {
    // Route reasoning models correctly on the first try (no wasted round-trip).
    let res = await post(isReasoning ? reasoningBody : standardBody);

    // Fallback: if the chosen shape is rejected for a param reason, try the
    // other shape (and drop structured output only if that was the offender).
    if (!res.ok && res.status === 400) {
      const detail = await res.text().catch(() => "");
      if (/temperature|max_tokens|max_completion_tokens|unsupported|response_format|json_schema/i.test(detail)) {
        const fallback = { ...(isReasoning ? standardBody : reasoningBody) };
        if (/response_format|json_schema/i.test(detail)) delete fallback.response_format;
        res = await post(fallback);
      } else {
        throw new Error(`LLM request failed (${res.status}): ${detail.slice(0, 300)}`);
      }
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`LLM request failed (${res.status}): ${detail.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("LLM response missing message content.");
    }
    return content.trim();
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error(`LLM request timed out after ${(options.timeoutMs ?? 45000) / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

/**
 * Resolve the model for a role. Each role can be set independently
 * (LLM_MODEL_ATTACKER / LLM_MODEL_JUDGE / LLM_MODEL_TARGET); each falls back to
 * the shared LLM_MODEL, then the built-in default. So role-differentiation is
 * opt-in via env — unset roles just use LLM_MODEL.
 */
export function modelFor(role?: AgentRole): string {
  const roleEnv = role ? process.env[`LLM_MODEL_${role.toUpperCase()}`] : undefined;
  return roleEnv || process.env.LLM_MODEL || DEFAULT_MODEL;
}

/** The shared/default model id (LLM_MODEL, or the built-in default). */
export function activeModel(): string {
  return modelFor();
}
