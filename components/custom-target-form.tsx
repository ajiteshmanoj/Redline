"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Check, X, Zap, Plug, Swords, Globe, FileText, Github, Search } from "lucide-react";
import type { HttpTargetConfig, PromptTarget } from "@/lib/types";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

export const TARGET_STORAGE_KEY = "redline.customTarget";

// What the /audit/custom pages read out of sessionStorage. Discriminated so a
// pasted/extracted prompt and an HTTP endpoint share one handoff channel.
export type StoredTarget =
  | { kind: "http"; http: HttpTargetConfig }
  | { kind: "prompt"; prompt: PromptTarget };

type Mode = "http" | "prompt" | "github";

type Preset = { id: string; label: string; note: string; config: HttpTargetConfig };

const PRESETS: Preset[] = [
  {
    id: "foxdesk",
    label: "FoxDesk (tuition demo)",
    note: "Live demo bot · /api/chat",
    config: {
      name: "FoxDesk — XYZ Tuition",
      endpoint: "https://ai-lead-capture-blue.vercel.app/api/chat",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      bodyTemplate:
        '{\n  "org_id": "00000000-0000-0000-0000-000000000002",\n  "channel": "web",\n  "message": "{{message}}",\n  "stream": false\n}',
      replyPath: "reply",
      sessionIdPath: "conversation_id",
      sessionIdField: "conversation_id",
    },
  },
  {
    id: "openai",
    label: "OpenAI-compatible",
    note: "Chat Completions shape",
    config: {
      name: "My OpenAI-style bot",
      endpoint: "https://api.openai.com/v1/chat/completions",
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer sk-..." },
      bodyTemplate:
        '{\n  "model": "gpt-4o-mini",\n  "messages": [{ "role": "user", "content": "{{message}}" }]\n}',
      replyPath: "choices.0.message.content",
    },
  },
  {
    id: "generic",
    label: "Generic JSON",
    note: "message in → reply out",
    config: {
      name: "My bot",
      endpoint: "https://your-bot.example.com/api/chat",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      bodyTemplate: '{\n  "message": "{{message}}"\n}',
      replyPath: "reply",
    },
  },
];

const PROMPT_PLACEHOLDER = `You are Ms. Bright, the friendly assistant for BrightMinds Tuition…

Paste the system prompt your bot runs on. Redline runs the full
attack battery against it on the live path and reports where it breaks.`;

const MODES: { id: Mode; label: string; icon: typeof Globe; note: string }[] = [
  { id: "prompt", label: "Paste prompt", icon: FileText, note: "Fastest — paste your system prompt" },
  { id: "github", label: "GitHub repo", icon: Github, note: "Find the prompt in a public repo" },
  { id: "http", label: "HTTP endpoint", icon: Globe, note: "Audit a deployed bot live" },
];

export function CustomTargetForm() {
  const [mode, setMode] = useState<Mode>("prompt");

  return (
    <div>
      {/* Mode switch */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {MODES.map((m) => (
          <button
            key={m.id}
            data-tour={`mode-${m.id}`}
            onClick={() => setMode(m.id)}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-4 text-left transition-colors",
              mode === m.id
                ? "border-redline/50 bg-redline/[0.06]"
                : "border-border bg-white/[0.02] hover:border-white/20",
            )}
          >
            <m.icon className={cn("mt-0.5 h-5 w-5 shrink-0", mode === m.id ? "text-redline" : "text-chalk-faint")} />
            <div>
              <p className="text-sm font-medium text-chalk">{m.label}</p>
              <p className="mt-0.5 text-xs text-chalk-faint">{m.note}</p>
            </div>
          </button>
        ))}
      </div>

      {mode === "http" ? <HttpForm /> : <PromptForm mode={mode} />}
    </div>
  );
}

/* --------------------------- paste / github ---------------------------- */

function PromptForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [source, setSource] = useState<string | undefined>();
  const [err, setErr] = useState<string | null>(null);

  // GitHub extraction state
  const [repo, setRepo] = useState("");
  const [finding, setFinding] = useState(false);
  const [candidates, setCandidates] = useState<{ path: string; prompt: string }[] | null>(null);

  const find = async () => {
    setErr(null);
    setCandidates(null);
    if (!repo.trim()) return setErr("Enter a public GitHub repo (owner/name or URL).");
    setFinding(true);
    try {
      const res = await fetch("/api/extract-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: repo.trim() }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErr(data.error || "Couldn't read that repo.");
      } else if (!data.candidates?.length) {
        setErr("No system-prompt-looking text found. Paste it manually below.");
      } else {
        setCandidates(data.candidates);
        // Pre-fill the best candidate.
        const top = data.candidates[0];
        setSystemPrompt(top.prompt);
        setName(data.repo || repo.trim());
        setSource(`github:${data.repo || repo.trim()}`);
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setFinding(false);
    }
  };

  const go = (path: string) => {
    setErr(null);
    if (!systemPrompt.trim()) return setErr("A system prompt is required.");
    const prompt: PromptTarget = {
      name: name.trim() || "Your bot",
      systemPrompt: systemPrompt.trim(),
      source: source ?? (mode === "github" ? "github" : "pasted"),
    };
    const stored: StoredTarget = { kind: "prompt", prompt };
    sessionStorage.setItem(TARGET_STORAGE_KEY, JSON.stringify(stored));
    router.push(path);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="panel grain space-y-5 p-6">
        {mode === "github" ? (
          <div>
            <Field label="Public GitHub repo" hint="owner/name or a full github.com URL. Public repos only.">
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="vercel/ai-chatbot"
                  spellCheck={false}
                  onKeyDown={(e) => e.key === "Enter" && find()}
                />
                <Button variant="secondary" onClick={find} disabled={finding} className="shrink-0">
                  {finding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Find prompt
                </Button>
              </div>
            </Field>

            {candidates ? (
              <div>
                <p className="mono-label mb-2">
                  Found {candidates.length} candidate{candidates.length === 1 ? "" : "s"} — pick one
                </p>
                <div className="flex flex-wrap gap-2">
                  {candidates.map((c) => (
                    <button
                      key={c.path}
                      onClick={() => {
                        setSystemPrompt(c.prompt);
                        setSource(`github:${name}/${c.path}`);
                      }}
                      className={cn(
                        "rounded-md border px-2.5 py-1.5 font-mono text-[11px] transition-colors",
                        systemPrompt === c.prompt
                          ? "border-redline/50 bg-redline/[0.08] text-chalk"
                          : "border-border bg-white/[0.02] text-chalk-dim hover:border-white/20",
                      )}
                    >
                      {c.path}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <Field label="Bot name">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="My support bot" />
        </Field>

        <Field
          label="System prompt"
          hint={
            mode === "github"
              ? "Extracted from the repo — review and edit before auditing."
              : "Paste the exact system prompt your bot runs on."
          }
        >
          <textarea
            className={cn(inputCls, "h-60 font-mono text-xs leading-relaxed")}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder={PROMPT_PLACEHOLDER}
            spellCheck={false}
          />
        </Field>

        {err ? (
          <p className="rounded-md border border-redline/40 bg-redline/[0.07] px-3 py-2 text-sm text-redline-bright">
            {err}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button onClick={() => go("/audit/custom")} className="group">
            <Zap className="h-4 w-4" /> Run Redline audit
          </Button>
          <Button onClick={() => go("/audit/custom/adaptive")} variant="outline" className="group">
            <Swords className="h-4 w-4" /> Run adaptive agent
          </Button>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="panel p-5">
          <p className="mono-label mb-3">How it works</p>
          <ol className="space-y-3 text-sm text-chalk-dim">
            <Step n={1}>
              {mode === "github"
                ? "Redline reads your public repo and finds the agent's system prompt."
                : "You paste the system prompt your bot runs on."}
            </Step>
            <Step n={2}>It runs the full attack battery against that prompt on the live path.</Step>
            <Step n={3}>A judge scores every reply — same console, report, and prove-the-fix.</Step>
          </ol>
        </div>
        <div className="panel border-warn/30 bg-warn/[0.04] p-5">
          <p className="mono-label mb-2">Needs the live path</p>
          <p className="text-sm leading-relaxed text-chalk-dim">
            An arbitrary prompt has no fixtures, so this runs live — set{" "}
            <span className="font-mono text-chalk">LLM_API_KEY</span>. The built-in demo bots stay
            network-free.
          </p>
        </div>
        {mode === "github" ? (
          <p className="px-1 text-xs leading-relaxed text-chalk-faint">
            Auditing the extracted prompt nails prompt-only bots; for tool-using agents it&apos;s a
            lower bound (it doesn&apos;t run their tools or RAG).
          </p>
        ) : null}
        <p className="px-1 text-xs leading-relaxed text-chalk-faint">
          Only audit bots you own or are authorised to test.
        </p>
      </aside>
    </div>
  );
}

/* ------------------------------ http form ------------------------------ */

function HttpForm() {
  const router = useRouter();
  const [cfg, setCfg] = useState<HttpTargetConfig>(PRESETS[0].config);
  const [headersText, setHeadersText] = useState(JSON.stringify(PRESETS[0].config.headers, null, 2));
  const [activePreset, setActivePreset] = useState("foxdesk");
  const [test, setTest] = useState<{ state: "idle" | "loading" | "ok" | "err"; msg?: string }>({
    state: "idle",
  });
  const [formErr, setFormErr] = useState<string | null>(null);

  const applyPreset = (p: Preset) => {
    setActivePreset(p.id);
    setCfg(p.config);
    setHeadersText(JSON.stringify(p.config.headers ?? {}, null, 2));
    setTest({ state: "idle" });
  };

  const set = <K extends keyof HttpTargetConfig>(k: K, v: HttpTargetConfig[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  const buildConfig = (): HttpTargetConfig | null => {
    setFormErr(null);
    if (!cfg.endpoint.trim()) return fail("Endpoint URL is required.");
    if (!/^https?:\/\//i.test(cfg.endpoint.trim())) return fail("Endpoint must start with http:// or https://");
    if (!cfg.bodyTemplate.includes("{{message}}")) return fail("Body template must include the {{message}} placeholder.");
    let headers: Record<string, string> = {};
    try {
      headers = headersText.trim() ? JSON.parse(headersText) : {};
    } catch {
      return fail("Headers must be valid JSON.");
    }
    return { ...cfg, headers, replyPath: cfg.replyPath.trim() || "reply" };
    function fail(m: string): null {
      setFormErr(m);
      return null;
    }
  };

  const runTest = async () => {
    const target = buildConfig();
    if (!target) return;
    setTest({ state: "loading" });
    try {
      const res = await fetch("/api/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, message: "Hi, what can you help me with?" }),
      });
      const data = await res.json();
      if (data.ok) setTest({ state: "ok", msg: data.reply });
      else setTest({ state: "err", msg: data.error || data.reply || "No reply." });
    } catch (e) {
      setTest({ state: "err", msg: (e as Error).message });
    }
  };

  const handoff = (path: string) => {
    const target = buildConfig();
    if (!target) return;
    const stored: StoredTarget = { kind: "http", http: target };
    sessionStorage.setItem(TARGET_STORAGE_KEY, JSON.stringify(stored));
    router.push(path);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="panel grain space-y-5 p-6">
        <div data-tour="foxdesk">
          <p className="mono-label mb-2">Start from a preset</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                className={cn(
                  "rounded-md border px-3 py-2 text-left transition-colors",
                  activePreset === p.id
                    ? "border-redline/50 bg-redline/[0.08]"
                    : "border-border bg-white/[0.02] hover:border-white/20",
                )}
              >
                <p className="text-sm font-medium text-chalk">{p.label}</p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-chalk-faint">{p.note}</p>
              </button>
            ))}
          </div>
        </div>

        <Field label="Display name">
          <input className={inputCls} value={cfg.name} onChange={(e) => set("name", e.target.value)} placeholder="My bot" />
        </Field>

        <Field label="Endpoint URL" hint="Redline POSTs here, server-side (no CORS issues).">
          <input className={inputCls} value={cfg.endpoint} onChange={(e) => set("endpoint", e.target.value)} placeholder="https://your-bot.com/api/chat" spellCheck={false} />
        </Field>

        <Field label="Request body template" hint="JSON. Put {{message}} where the attack text goes.">
          <textarea
            className={cn(inputCls, "h-36 font-mono text-xs leading-relaxed")}
            value={cfg.bodyTemplate}
            onChange={(e) => set("bodyTemplate", e.target.value)}
            spellCheck={false}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Reply path" hint='e.g. "reply" or "choices.0.message.content"'>
            <input className={inputCls} value={cfg.replyPath} onChange={(e) => set("replyPath", e.target.value)} spellCheck={false} />
          </Field>
          <Field label="Headers (JSON)" hint="Add auth here if the bot needs it.">
            <textarea
              className={cn(inputCls, "h-[42px] min-h-[42px] font-mono text-xs")}
              value={headersText}
              onChange={(e) => setHeadersText(e.target.value)}
              spellCheck={false}
            />
          </Field>
        </div>

        {formErr ? (
          <p className="rounded-md border border-redline/40 bg-redline/[0.07] px-3 py-2 text-sm text-redline-bright">
            {formErr}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button variant="secondary" onClick={runTest} disabled={test.state === "loading"}>
            {test.state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            Test connection
          </Button>
          <Button data-tour="run-audit" onClick={() => handoff("/audit/custom")} className="group">
            <Zap className="h-4 w-4" /> Run Redline audit
          </Button>
          <Button onClick={() => handoff("/audit/custom/adaptive")} variant="outline" className="group">
            <Swords className="h-4 w-4" /> Run adaptive agent
          </Button>
        </div>

        {test.state === "ok" || test.state === "err" ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-md border p-3 text-sm",
              test.state === "ok" ? "border-safe/40 bg-safe/[0.06]" : "border-redline/40 bg-redline/[0.06]",
            )}
          >
            <p className="mb-1 flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider">
              {test.state === "ok" ? (
                <><Check className="h-3.5 w-3.5 text-safe" /> <span className="text-safe">Connected · bot replied</span></>
              ) : (
                <><X className="h-3.5 w-3.5 text-redline" /> <span className="text-redline-bright">Couldn&apos;t reach the bot</span></>
              )}
            </p>
            <p className="font-mono text-xs leading-relaxed text-chalk-dim">{test.msg}</p>
          </motion.div>
        ) : null}
      </div>

      <aside className="space-y-4">
        <div className="panel p-5">
          <p className="mono-label mb-3">How it works</p>
          <ol className="space-y-3 text-sm text-chalk-dim">
            <Step n={1}>You grant access by giving Redline the bot&apos;s endpoint + body shape.</Step>
            <Step n={2}>Redline fires the full attack battery at it, server-side, over the network.</Step>
            <Step n={3}>A judge scores every reply. You get the same live console + report.</Step>
          </ol>
        </div>
        <div className="panel p-5">
          <p className="mono-label mb-2">Judging</p>
          <p className="text-sm leading-relaxed text-chalk-faint">
            With <span className="font-mono text-chalk-dim">LLM_API_KEY</span> set, verdicts use the judge
            model. Without a key, Redline falls back to a labelled heuristic so it still runs.
          </p>
        </div>
        <p className="px-1 text-xs leading-relaxed text-chalk-faint">
          Only audit bots you own or are authorised to test.
        </p>
      </aside>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-border bg-ink-900/60 px-3 py-2.5 text-sm text-chalk outline-none transition-colors placeholder:text-chalk-faint focus:border-redline/50";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-chalk">{label}</span>
      {hint ? <span className="mb-1.5 block font-mono text-[11px] text-chalk-faint">{hint}</span> : null}
      {children}
    </label>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-redline/40 font-mono text-[11px] text-redline">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
