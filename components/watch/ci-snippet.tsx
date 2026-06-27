"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

const SNIPPET = `# .github/workflows/redline.yml
# Gate every deploy on a Redline re-audit.
name: redline-watch
on: [deployment_status]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: redline/audit-action@v1
        with:
          target: \${{ vars.REDLINE_TARGET_URL }}
          api-key: \${{ secrets.REDLINE_API_KEY }}
          fail-on: high   # block the deploy if risk >= 60`;

export function CiSnippet() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <p className="font-mono text-xs text-chalk-dim">redline.yml · GitHub Actions</p>
        <button
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-white/[0.03] px-3 py-1.5 font-mono text-xs text-chalk-dim transition-colors hover:border-white/20 hover:text-chalk"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-safe" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre bg-ink-900/60 px-5 py-4 font-mono text-xs leading-relaxed text-chalk-dim">
        {SNIPPET}
      </pre>
    </div>
  );
}
