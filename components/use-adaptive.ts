"use client";

import { useCallback, useRef, useState } from "react";
import type {
  AdaptiveCampaign,
  AdaptiveEvent,
  AdaptiveSummary,
  AdaptiveTurn,
  AttackCategoryId,
  HttpTargetConfig,
  RoleModels,
  TargetProfile,
} from "@/lib/types";

export type AdaptiveRunConfig = { botId?: string; target?: HttpTargetConfig };

export type AdaptivePhase = "idle" | "running" | "done" | "error";

export type CurrentCampaign = {
  goalId: string;
  category: AttackCategoryId;
  title: string;
  objective: string;
} | null;

export type AdaptiveState = {
  phase: AdaptivePhase;
  mode: "demo" | "live" | null;
  model: string | null;
  models: RoleModels | null;
  maxTurns: number;
  totalGoals: number;
  recon: TargetProfile | null; // the agent's profile of the target
  campaigns: AdaptiveCampaign[]; // completed campaigns
  current: CurrentCampaign; // in-progress campaign
  liveTurns: AdaptiveTurn[]; // streaming turns of the in-progress campaign
  summary: AdaptiveSummary | null;
  error: string | null;
};

const INITIAL: AdaptiveState = {
  phase: "idle",
  mode: null,
  model: null,
  models: null,
  maxTurns: 5,
  totalGoals: 0,
  recon: null,
  campaigns: [],
  current: null,
  liveTurns: [],
  summary: null,
  error: null,
};

export function useAdaptive(config: AdaptiveRunConfig) {
  const [state, setState] = useState<AdaptiveState>(INITIAL);
  const runningRef = useRef(false);
  const cfgRef = useRef(config);
  cfgRef.current = config;

  const start = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setState({ ...INITIAL, phase: "running" });

    try {
      const res = await fetch("/api/adaptive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfgRef.current),
      });
      if (!res.body) throw new Error("No response stream from adaptive agent.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          let event: AdaptiveEvent | { type: "error"; message: string };
          try {
            event = JSON.parse(trimmed);
          } catch {
            continue;
          }
          handleEvent(event);
        }
      }
    } catch (err) {
      setState((s) => ({ ...s, phase: "error", error: (err as Error).message }));
    } finally {
      runningRef.current = false;
    }

    function handleEvent(event: AdaptiveEvent | { type: "error"; message: string }) {
      switch (event.type) {
        case "start":
          setState((s) => ({
            ...s,
            mode: event.mode,
            model: event.model ?? null,
            models: event.models ?? null,
            maxTurns: event.maxTurns,
            totalGoals: event.totalGoals,
          }));
          break;
        case "recon":
          setState((s) => ({ ...s, recon: event.profile }));
          break;
        case "campaign_start":
          setState((s) => ({
            ...s,
            current: {
              goalId: event.goalId,
              category: event.category,
              title: event.title,
              objective: event.objective,
            },
            liveTurns: [],
          }));
          break;
        case "turn":
          setState((s) => ({ ...s, liveTurns: [...s.liveTurns, event.turn] }));
          break;
        case "campaign_done":
          setState((s) => ({
            ...s,
            campaigns: [...s.campaigns, event.campaign],
            current: null,
            liveTurns: [],
          }));
          break;
        case "done":
          setState((s) => ({
            ...s,
            phase: "done",
            current: null,
            liveTurns: [],
            summary: event.summary,
          }));
          break;
        case "error":
          setState((s) => ({ ...s, phase: "error", error: event.message }));
          break;
      }
    }
  }, []);

  return { state, start };
}
