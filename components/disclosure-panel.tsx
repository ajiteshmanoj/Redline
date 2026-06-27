"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Download, Mail, ShieldCheck, EyeOff } from "lucide-react";
import type { AuditSummary, Vulnerability, PromptPatch } from "@/lib/types";
import { buildDisclosureMarkdown, buildDisclosureEmail } from "@/lib/disclosure";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

export function DisclosurePanel({
  targetName,
  endpoint,
  summary,
  vulnerabilities,
  patches,
}: {
  targetName: string;
  endpoint?: string;
  summary: AuditSummary;
  vulnerabilities: Vulnerability[];
  patches: PromptPatch[];
}) {
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterContact, setReporterContact] = useState("");
  const [redact, setRedact] = useState(true);
  const [copied, setCopied] = useState(false);

  const input = useMemo(
    () => ({
      targetName,
      endpoint,
      companyName,
      reporterName,
      reporterContact,
      dateISO: new Date().toISOString(),
      summary,
      vulnerabilities,
      patches,
      redact,
    }),
    [targetName, endpoint, companyName, reporterName, reporterContact, summary, vulnerabilities, patches, redact],
  );

  const markdown = useMemo(() => buildDisclosureMarkdown(input), [input]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const download = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `redline-disclosure-${targetName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const email = () => {
    const { subject, body } = buildDisclosureEmail(input);
    const to = contactEmail.trim();
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="panel grain overflow-hidden"
    >
      <div className="border-b border-border px-6 py-4">
        <p className="flex items-center gap-2 font-display text-lg font-semibold">
          <ShieldCheck className="h-5 w-5 text-safe" /> Good-faith disclosure
        </p>
        <p className="mt-1 text-sm text-chalk-dim">
          Generate a clean report to send the company so they can fix it. Personal data the bot
          leaked is redacted by default — you never keep or share someone else&apos;s details.
        </p>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[320px_1fr]">
        {/* controls */}
        <div className="space-y-4">
          <Field label="Company / team name">
            <input className={inputCls} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder={targetName} />
          </Field>
          <Field label="Their security contact (email)">
            <input className={inputCls} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="security@company.com" spellCheck={false} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Your name">
              <input className={inputCls} value={reporterName} onChange={(e) => setReporterName(e.target.value)} placeholder="optional" />
            </Field>
            <Field label="Your contact">
              <input className={inputCls} value={reporterContact} onChange={(e) => setReporterContact(e.target.value)} placeholder="optional" spellCheck={false} />
            </Field>
          </div>

          <button
            onClick={() => setRedact((v) => !v)}
            className={cn(
              "flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-sm transition-colors",
              redact ? "border-safe/40 bg-safe/[0.06] text-safe" : "border-border text-chalk-dim hover:border-white/20",
            )}
          >
            <span className="flex items-center gap-2">
              <EyeOff className="h-4 w-4" /> Redact leaked personal data
            </span>
            <span className="font-mono text-[11px] uppercase tracking-wider">{redact ? "on" : "off"}</span>
          </button>

          <div className="flex flex-col gap-2 pt-1">
            <Button onClick={email} disabled={!contactEmail.trim()}>
              <Mail className="h-4 w-4" /> Email the company
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={copy}>
                {copied ? <Check className="h-4 w-4 text-safe" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy report"}
              </Button>
              <Button variant="secondary" className="flex-1" onClick={download}>
                <Download className="h-4 w-4" /> .md
              </Button>
            </div>
            <p className="text-xs leading-relaxed text-chalk-faint">
              Email opens a prefilled draft; attach or paste the downloaded report.
            </p>
          </div>
        </div>

        {/* preview */}
        <div className="overflow-hidden rounded-md border border-border bg-ink-900/60">
          <div className="border-b border-border px-4 py-2">
            <span className="mono-label">disclosure.md · preview</span>
          </div>
          <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed text-chalk-dim">
            {markdown}
          </pre>
        </div>
      </div>
    </motion.div>
  );
}

const inputCls =
  "w-full rounded-md border border-border bg-ink-900/60 px-3 py-2.5 text-sm text-chalk outline-none transition-colors placeholder:text-chalk-faint focus:border-redline/50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-chalk">{label}</span>
      {children}
    </label>
  );
}
