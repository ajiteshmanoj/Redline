import { ShieldCheck } from "lucide-react";
import { OWASP_LABEL, PDPA_LABEL, MAS_SHORT, NON_AFFILIATION } from "@/lib/standards";

// Clean, text-only standards strip. Deliberately NOT official logos — using a
// regulator's mark implies an endorsement that doesn't exist. "Mapped to", not
// "endorsed by". The disclaimer keeps it honest for a regulator-adjacent room.

const BADGES = [
  { label: OWASP_LABEL, scope: "every LLM app" },
  { label: PDPA_LABEL, scope: "personal-data findings" },
  { label: MAS_SHORT, scope: "financial institutions" },
];

export function StandardsStrip({ className = "" }: { className?: string }) {
  return (
    <div className={`panel p-5 sm:p-6 ${className}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="mono-label flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-redline" /> Mapped to
        </p>
        <div className="flex flex-wrap gap-2">
          {BADGES.map((b) => (
            <span
              key={b.label}
              className="inline-flex items-baseline gap-1.5 rounded-md border border-border bg-white/[0.02] px-2.5 py-1"
            >
              <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-chalk">
                {b.label}
              </span>
              <span className="font-mono text-[10px] text-chalk-faint">· {b.scope}</span>
            </span>
          ))}
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-chalk-faint">{NON_AFFILIATION}</p>
    </div>
  );
}
