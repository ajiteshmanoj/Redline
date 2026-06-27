import { NextRequest } from "next/server";
import { getBot } from "@/lib/bots";
import {
  ADAPTIVE_GOALS,
  MAX_TURNS,
  httpResponder,
  profileForAttacker,
  profileTarget,
  runAdaptiveCampaign,
  summarizeAdaptive,
  systemPromptResponder,
  type TargetResponder,
} from "@/lib/adaptive";
import { exaConfigured } from "@/lib/exa";
import { getAdaptiveFixture, getAdaptiveProfile } from "@/lib/fixtures";
import { isDemoMode, modelFor } from "@/lib/llm";
import { sleep } from "@/lib/utils";
import type { AdaptiveCampaign, AdaptiveEvent, HttpTargetConfig, PromptTarget } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pacing for the cinematic replay in demo mode. Tight so the multi-turn demo
// stays short and sharp on stage.
const DEMO_TURN_MS = 340;
const DEMO_GAP_MS = 200;

// Label for the Exa recon role in the "AI in this run" roster (not an LLM, so
// it has no model id — it's the agent's eyes on the real world).
const RECON_MODEL = "Exa · neural web search";

/** Run every adaptive goal live against a responder, streaming events. */
async function runLiveCampaigns(
  summaryId: string,
  respond: TargetResponder,
  send: (event: AdaptiveEvent) => void,
  companyName?: string,
): Promise<void> {
  // Recon first: profile the bot AND search the real web (Exa) for the company,
  // then tailor every attack to what we learned.
  const profile = await profileTarget(respond, { companyName });
  send({ type: "recon", profile });
  const brief = profileForAttacker(profile);

  const campaigns: AdaptiveCampaign[] = [];
  for (const goal of ADAPTIVE_GOALS) {
    send({
      type: "campaign_start",
      goalId: goal.id,
      category: goal.category,
      title: goal.title,
      objective: goal.objective,
    });
    const campaign = await runAdaptiveCampaign(goal, respond, {
      maxTurns: MAX_TURNS,
      profile: brief,
      onTurn: (turn) => send({ type: "turn", goalId: goal.id, turn }),
    });
    campaigns.push(campaign);
    send({ type: "campaign_done", campaign });
  }
  send({ type: "done", summary: summarizeAdaptive(summaryId, campaigns), campaigns });
}

export async function POST(req: NextRequest) {
  const { botId, target, prompt } = (await req.json().catch(() => ({}))) as {
    botId?: string;
    target?: HttpTargetConfig;
    prompt?: PromptTarget;
  };
  const bot = botId ? getBot(botId) : undefined;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: AdaptiveEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      const fail = (message: string) => {
        controller.enqueue(encoder.encode(JSON.stringify({ type: "error", message }) + "\n"));
        controller.close();
      };

      // A custom HTTP target always runs live (ignores DEMO_MODE), like audits.
      if (target) {
        if (!target.endpoint) return fail("Target endpoint is required.");
        const name = target.name || "Live target";
        send({
          type: "start",
          botId: "custom",
          botName: name,
          totalGoals: ADAPTIVE_GOALS.length,
          maxTurns: MAX_TURNS,
          mode: "live",
          model: modelFor("attacker"),
          // External target is the user's bot; attacker + judge are our models.
          models: {
            ...(exaConfigured() ? { recon: RECON_MODEL } : {}),
            attacker: modelFor("attacker"),
            judge: modelFor("judge"),
          },
        });
        try {
          await runLiveCampaigns(name, httpResponder(target), send, name);
        } catch (err) {
          return fail((err as Error).message);
        }
        controller.close();
        return;
      }

      // A user-supplied system prompt (pasted / from GitHub) — always live.
      if (prompt) {
        if (!prompt.systemPrompt?.trim()) return fail("A system prompt is required.");
        const name = prompt.name || "Your bot";
        send({
          type: "start",
          botId: "custom",
          botName: name,
          totalGoals: ADAPTIVE_GOALS.length,
          maxTurns: MAX_TURNS,
          mode: "live",
          model: modelFor("attacker"),
          models: {
            ...(exaConfigured() ? { recon: RECON_MODEL } : {}),
            attacker: modelFor("attacker"),
            target: modelFor("target"),
            judge: modelFor("judge"),
          },
        });
        try {
          await runLiveCampaigns(name, systemPromptResponder(prompt.systemPrompt), send, name);
        } catch (err) {
          return fail((err as Error).message);
        }
        controller.close();
        return;
      }

      if (!bot) return fail("Unknown bot.");

      const demo = isDemoMode();
      const fixture = demo ? getAdaptiveFixture(bot.id) : null;

      send({
        type: "start",
        botId: bot.id,
        botName: bot.name,
        totalGoals: ADAPTIVE_GOALS.length,
        maxTurns: MAX_TURNS,
        mode: demo ? "demo" : "live",
        model: demo ? undefined : modelFor("attacker"),
        // Roster shown in both modes (config); demo replays captured fixtures.
        // Recon is part of the run in demo (the captured run used Exa) or live
        // when an Exa key is configured.
        models: {
          ...(demo || exaConfigured() ? { recon: RECON_MODEL } : {}),
          attacker: modelFor("attacker"),
          target: modelFor("target"),
          judge: modelFor("judge"),
        },
      });

      try {
        // ----- Demo replay (zero network) -----
        if (fixture) {
          const profile = getAdaptiveProfile(bot.id);
          if (profile) {
            await sleep(DEMO_GAP_MS);
            send({ type: "recon", profile });
            await sleep(DEMO_TURN_MS);
          }
          for (const campaign of fixture) {
            send({
              type: "campaign_start",
              goalId: campaign.goalId,
              category: campaign.category,
              title: campaign.title,
              objective: campaign.objective,
            });
            for (const turn of campaign.turns) {
              await sleep(DEMO_TURN_MS);
              send({ type: "turn", goalId: campaign.goalId, turn });
            }
            send({ type: "campaign_done", campaign });
            await sleep(DEMO_GAP_MS);
          }
          send({
            type: "done",
            summary: summarizeAdaptive(bot.id, fixture),
            campaigns: fixture,
          });
          controller.close();
          return;
        }

        // ----- Live multi-turn campaigns -----
        await runLiveCampaigns(
          bot.id,
          systemPromptResponder(bot.systemPrompt),
          send,
          bot.business || bot.name,
        );
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
      // Disable proxy buffering so each turn flushes the moment the model returns.
      "X-Accel-Buffering": "no",
    },
  });
}
