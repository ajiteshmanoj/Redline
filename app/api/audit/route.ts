import { NextRequest } from "next/server";
import { getBot } from "@/lib/bots";
import { attacksForBot, runAttackLive, runAttackHttp } from "@/lib/attacks";
import { getFixtureResults, getHardenedFixtureResults } from "@/lib/fixtures";
import { isDemoMode, modelFor } from "@/lib/llm";
import { summarize, vulnerabilities, suggestPatches, buildHardenedPrompt } from "@/lib/audit";
import { sleep } from "@/lib/utils";
import type { AuditEvent, AttackResult, HttpTargetConfig } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pacing for the cinematic "executing live" feel (demo mode only). Kept tight
// so the stage demo stays short and sharp.
const DEMO_THINK_MS = 300; // time the attack appears "in flight"
const DEMO_GAP_MS = 120; // pause between attacks

export async function POST(req: NextRequest) {
  const { botId, hardened, target } = (await req.json().catch(() => ({}))) as {
    botId?: string;
    hardened?: boolean;
    target?: HttpTargetConfig;
  };
  const bot = botId ? getBot(botId) : undefined;
  const isHardened = Boolean(hardened);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: AuditEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      const fail = (message: string) => {
        controller.enqueue(encoder.encode(JSON.stringify({ type: "error", message }) + "\n"));
        controller.close();
      };

      const attacks = attacksForBot();
      const collected: AttackResult[] = [];

      // ===== Live external HTTP target (always real; ignores DEMO_MODE) =====
      if (target) {
        if (!target.endpoint) return fail("Target endpoint is required.");
        const name = target.name || "Live target";
        send({
          type: "start",
          botId: "custom",
          botName: name,
          total: attacks.length,
          mode: "live",
          // External target is the user's own bot; only the judge is our model.
          model: modelFor("judge"),
          models: { judge: modelFor("judge") },
        });
        try {
          for (let i = 0; i < attacks.length; i++) {
            const attack = attacks[i];
            send({ type: "attack_start", attackId: attack.id, category: attack.category, title: attack.title });
            const result = await runAttackHttp(attack, target);
            collected.push(result);
            send({ type: "attack_result", result, index: i, total: attacks.length });
            await sleep(250); // be polite to the target
          }
          send({
            type: "done",
            summary: summarize(name, collected),
            vulnerabilities: vulnerabilities(collected),
            patches: suggestPatches(collected),
          });
        } catch (err) {
          return fail((err as Error).message);
        }
        controller.close();
        return;
      }

      // ===== Built-in system-prompt bot (demo fixtures or live LLM) =====
      if (!bot) return fail("Unknown bot.");

      const demo = isDemoMode();
      send({
        type: "start",
        botId: bot.id,
        botName: bot.name,
        total: attacks.length,
        mode: demo ? "demo" : "live",
        model: demo ? undefined : modelFor("judge"),
        // Roster shown in both modes (config); demo replays captured fixtures.
        models: { target: modelFor("target"), judge: modelFor("judge") },
      });

      const fixtureResults = demo
        ? isHardened
          ? getHardenedFixtureResults(bot.id)
          : getFixtureResults(bot.id)
        : [];
      const fixtureById = new Map(fixtureResults.map((r) => [r.attackId, r]));
      const systemPrompt = isHardened ? buildHardenedPrompt(bot.systemPrompt) : bot.systemPrompt;

      // For an independent HTTP-backed bot, the (non-hardened) live path drives
      // it as a black box over HTTP. Resolve a relative endpoint against this
      // request's origin so it works both locally and when deployed. The
      // hardened re-audit applies the patches to the system prompt instead,
      // since a black-box endpoint can't be hardened in place.
      const liveHttpTarget =
        !demo && !isHardened && bot.httpTarget
          ? {
              ...bot.httpTarget,
              endpoint: new URL(bot.httpTarget.endpoint, req.nextUrl.origin).toString(),
            }
          : null;

      try {
        for (let i = 0; i < attacks.length; i++) {
          const attack = attacks[i];
          send({
            type: "attack_start",
            attackId: attack.id,
            category: attack.category,
            title: attack.title,
          });

          let result: AttackResult;
          if (demo) {
            await sleep(DEMO_THINK_MS);
            result =
              fixtureById.get(attack.id) ?? {
                attackId: attack.id,
                category: attack.category,
                title: attack.title,
                prompt: attack.prompt,
                response: "(no scripted response)",
                verdict: { broken: false, severity: 1, reason: "No fixture." },
              };
          } else if (liveHttpTarget) {
            result = await runAttackHttp(attack, liveHttpTarget);
          } else {
            result = await runAttackLive(attack, systemPrompt);
          }

          collected.push(result);
          send({ type: "attack_result", result, index: i, total: attacks.length });
          if (demo) await sleep(DEMO_GAP_MS);
        }

        send({
          type: "done",
          summary: summarize(bot.id, collected),
          vulnerabilities: vulnerabilities(collected),
          patches: suggestPatches(collected),
        });
      } catch (err) {
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: "error", message: (err as Error).message }) + "\n"),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disable proxy buffering so each NDJSON line flushes immediately.
      "X-Accel-Buffering": "no",
    },
  });
}
