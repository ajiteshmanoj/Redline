// ===========================================================================
// lib/exa.ts — Exa search client (the adaptive agent's eyes on the real world).
//
// Redline's adaptive agent profiles its target before attacking. On its own it
// can only ask the bot about itself. Exa upgrades recon to real-world OSINT:
// a neural web search for the target company, whose results are then distilled
// (by the OpenAI attacker model, see lib/adaptive.ts) into an attack-surface
// profile — named competitors, the personal data the business likely holds,
// notable products/policies. The agent then grounds its attacks in reality.
//
// Everything Exa-specific lives in THIS FILE. Gated on EXA_API_KEY: with no key
// the app falls back to bot-only recon (and DEMO_MODE replays a captured
// fixture), so nothing breaks when Exa isn't configured.
// ===========================================================================

const EXA_BASE = "https://api.exa.ai";

/** True when an Exa key is configured — callers fall back gracefully otherwise. */
export function exaConfigured(): boolean {
  return Boolean(process.env.EXA_API_KEY);
}

export type ExaResult = {
  title: string;
  url: string;
  // Exa-generated summary of the page (or a text snippet fallback).
  snippet: string;
};

/**
 * Neural web search via Exa. Returns the top results with a short summary each.
 * Throws on missing key / transport error — callers catch and fall back.
 */
export async function exaSearch(
  query: string,
  opts: { numResults?: number; timeoutMs?: number } = {},
): Promise<ExaResult[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) throw new Error("EXA_API_KEY is not set");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 12000);
  try {
    const res = await fetch(`${EXA_BASE}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({
        query,
        type: "auto", // let Exa pick neural vs keyword
        numResults: opts.numResults ?? 5,
        contents: { summary: true, text: { maxCharacters: 600 } },
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Exa request failed (${res.status}): ${detail.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      results?: { title?: string; url?: string; summary?: string; text?: string }[];
    };
    return (data.results ?? [])
      .filter((r) => r.url)
      .map((r) => ({
        title: (r.title || r.url || "").trim(),
        url: r.url as string,
        snippet: (r.summary || r.text || "").trim().slice(0, 600),
      }));
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error(`Exa request timed out after ${(opts.timeoutMs ?? 12000) / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
