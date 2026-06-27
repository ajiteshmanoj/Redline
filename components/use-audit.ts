"use client";

import { useCallback, useRef, useState } from "react";
import type {
  AttackResult,
  AuditEvent,
  AuditSummary,
  PromptPatch,
  Vulnerability,
  AttackCategoryId,
  HttpTargetConfig,
  PromptTarget,
  RoleModels,
} from "@/lib/types";
import { scoreResults } from "@/lib/audit";

export type AuditRunConfig = {
  botId?: string;
  target?: HttpTargetConfig;
  prompt?: PromptTarget;
};

export type AuditPhase = "idle" | "running" | "done" | "error";

export type CurrentAttack = {
  attackId: string;
  category: AttackCategoryId;
  title: string;
} | null;

export type AuditState = {
  phase: AuditPhase;
  mode: "demo" | "live" | null;
  model: string | null;
  models: RoleModels | null;
  hardened: boolean;
  results: AttackResult[];
  current: CurrentAttack;
  liveScore: number;
  completed: number;
  total: number;
  summary: AuditSummary | null;
  vulnerabilities: Vulnerability[];
  patches: PromptPatch[];
  error: string | null;
};

const INITIAL: AuditState = {
  phase: "idle",
  mode: null,
  model: null,
  models: null,
  hardened: false,
  results: [],
  current: null,
  liveScore: 0,
  completed: 0,
  total: 0,
  summary: null,
  vulnerabilities: [],
  patches: [],
  error: null,
};

export function useAudit(config: AuditRunConfig) {
  const [state, setState] = useState<AuditState>(INITIAL);
  const runningRef = useRef(false);
  // Read latest config without making `start` re-create on every render.
  const cfgRef = useRef(config);
  cfgRef.current = config;

  const start = useCallback(
    async (hardened = false) => {
    if (runningRef.current) return;
    runningRef.current = true;
    setState({ ...INITIAL, phase: "running", hardened });

    let collected: AttackResult[] = [];

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...cfgRef.current, hardened }),
      });
      if (!res.body) throw new Error("No response stream from audit engine.");

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
          let event: AuditEvent | { type: "error"; message: string };
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

    function handleEvent(event: AuditEvent | { type: "error"; message: string }) {
      switch (event.type) {
        case "start":
          setState((s) => ({
            ...s,
            mode: event.mode,
            model: event.model ?? null,
            models: event.models ?? null,
            total: event.total,
          }));
          break;
        case "attack_start":
          setState((s) => ({
            ...s,
            current: {
              attackId: event.attackId,
              category: event.category,
              title: event.title,
            },
          }));
          break;
        case "attack_result": {
          collected = [...collected, event.result];
          const liveScore = scoreResults(collected);
          setState((s) => ({
            ...s,
            results: collected,
            completed: collected.length,
            liveScore,
            current: null,
          }));
          break;
        }
        case "done":
          setState((s) => ({
            ...s,
            phase: "done",
            current: null,
            summary: event.summary,
            vulnerabilities: event.vulnerabilities,
            patches: event.patches,
            liveScore: event.summary.score,
          }));
          break;
        case "error":
          setState((s) => ({ ...s, phase: "error", error: event.message }));
          break;
      }
    }
    },
    [],
  );

  return { state, start };
}
