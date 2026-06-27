import type { AttackResult, AuditSummary, PromptPatch, Vulnerability } from "./types";

// ===========================================================================
// Saved reports — lightweight client-side persistence (localStorage), so a
// finding survives a refresh and can be revisited, exported, or disclosed
// later. No backend, no account; everything stays on this device.
// ===========================================================================

const KEY = "redline.savedReports.v1";

export type SavedReport = {
  id: string;
  targetName: string;
  endpoint?: string;
  savedAt: string; // ISO
  summary: AuditSummary;
  vulnerabilities: Vulnerability[];
  patches: PromptPatch[];
  results: AttackResult[];
};

function read(): SavedReport[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "[]") as SavedReport[];
  } catch {
    return [];
  }
}

function write(list: SavedReport[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

export function listReports(): SavedReport[] {
  return read().sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
}

export function getReport(id: string): SavedReport | undefined {
  return read().find((r) => r.id === id);
}

export function saveReport(r: Omit<SavedReport, "id" | "savedAt">): SavedReport {
  const id = `rpt_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`;
  const entry: SavedReport = { ...r, id, savedAt: new Date().toISOString() };
  write([entry, ...read()]);
  return entry;
}

export function removeReport(id: string) {
  write(read().filter((r) => r.id !== id));
}
