import type { HttpTargetConfig } from "./types";

// ===========================================================================
// HTTP target adapter — lets Redline attack ANY external chatbot that speaks
// JSON over HTTP, not just the built-in system-prompt bots. This is the
// "grant access by URL" path: the user supplies an endpoint + body template +
// reply path, and Redline drives it like a black box.
//
// Runs server-side (in the API route) so it isn't blocked by CORS and so the
// browser never sees the target's credentials. No SSRF guard on purpose — this
// is a local tool and you may legitimately want to test a bot on localhost.
// ===========================================================================

/** Resolve a dot/index path like "choices.0.message.content" against an object. */
export function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null) return undefined;
    const idx = Number(key);
    if (Array.isArray(acc) && Number.isInteger(idx)) return acc[idx];
    if (typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

/** Inject the message into the body template, safely JSON-escaped. */
export function buildBody(bodyTemplate: string, message: string): string {
  // Replace the placeholder (with or without surrounding quotes) with a
  // properly quoted + escaped JSON string.
  const body = bodyTemplate.replace(/"?\{\{\s*message\s*\}\}"?/g, JSON.stringify(message));
  JSON.parse(body); // throws early if the template produced invalid JSON
  return body;
}

/** Send one message to the target bot and return its reply text. */
export async function callHttpTarget(
  target: HttpTargetConfig,
  message: string,
  timeoutMs = 30000,
): Promise<string> {
  return (await callHttpTargetSession(target, message, undefined, timeoutMs)).reply;
}

/**
 * Multi-turn variant: optionally inject a prior session/conversation id into the
 * request body (so a stateful bot remembers the thread) and return both the
 * reply and any session id found in the response. Used by the adaptive agent.
 */
export async function callHttpTargetSession(
  target: HttpTargetConfig,
  message: string,
  sessionId: string | undefined,
  timeoutMs = 30000,
): Promise<{ reply: string; sessionId: string | undefined }> {
  let body = buildBody(target.bodyTemplate, message);

  // Inject the session id back into the body when threading a conversation.
  if (sessionId && target.sessionIdField) {
    try {
      const obj = JSON.parse(body) as Record<string, unknown>;
      obj[target.sessionIdField] = sessionId;
      body = JSON.stringify(obj);
    } catch {
      /* template wasn't a JSON object — send as-is */
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(target.headers ?? {}),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(target.endpoint, {
      method: target.method ?? "POST",
      headers,
      body,
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) {
      return { reply: `[target returned HTTP ${res.status}: ${text.slice(0, 200)}]`, sessionId };
    }
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return { reply: text.slice(0, 2000), sessionId }; // non-JSON reply — return raw
    }
    // Carry forward any session id the bot returned (fall back to the prior one).
    let nextSession = sessionId;
    if (target.sessionIdPath) {
      const found = getByPath(data, target.sessionIdPath);
      if (typeof found === "string" && found) nextSession = found;
    }
    const reply = getByPath(data, target.replyPath || "reply");
    if (typeof reply === "string") return { reply, sessionId: nextSession };
    return { reply: JSON.stringify(reply ?? data).slice(0, 2000), sessionId: nextSession };
  } finally {
    clearTimeout(timer);
  }
}
