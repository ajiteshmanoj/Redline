import { Globe, Scale, Swords } from "lucide-react";
import type { RoleModels } from "@/lib/types";

/**
 * "AI in this run" body — shows the role each model plays this run, so judges
 * see a deliberate, role-differentiated pipeline: an Exa recon scout, an OpenAI
 * attacker, the target, and a separate OpenAI judge. Honest about mode: live =
 * calling now; demo = configured roster, replaying a captured run.
 */
export function RunRoster({
  models,
  mode,
}: {
  models: RoleModels | null;
  mode: "demo" | "live" | null;
}) {
  if (!models) return null;
  return (
    <>
      <ul className="space-y-3 text-sm">
        {models.recon ? (
          <RosterRow
            icon={<Globe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-redline" />}
            label="Recon scout"
            note="profiles the real company on the live web, first"
            model={models.recon}
            tag="OSINT → OpenAI"
          />
        ) : null}
        {models.attacker ? (
          <RosterRow
            icon={<Swords className="mt-0.5 h-3.5 w-3.5 shrink-0 text-redline" />}
            label="Adversarial agent"
            note="writes &amp; escalates each turn"
            model={models.attacker}
            tag="reasoning"
          />
        ) : null}
        {models.target ? (
          <RosterRow
            icon={<span className="mt-0.5 shrink-0 font-mono text-xs font-semibold text-safe">◂</span>}
            label="Target model"
            note="generates the bot's replies"
            model={models.target}
          />
        ) : null}
        {models.judge ? (
          <RosterRow
            icon={<Scale className="mt-0.5 h-3.5 w-3.5 shrink-0 text-redline" />}
            label="LLM judge"
            note="scores each reply, separate call"
            model={models.judge}
            tag="structured outputs"
          />
        ) : null}
      </ul>
      <p className="mt-3 flex items-center gap-1.5 border-t border-border pt-2.5 font-mono text-[11px] uppercase tracking-wider text-chalk-faint">
        {mode === "live" ? (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-redline" /> calling these models live now
          </>
        ) : (
          "configured roster · demo replays a captured run"
        )}
      </p>
    </>
  );
}

function RosterRow({
  icon,
  label,
  note,
  model,
  tag,
}: {
  icon: React.ReactNode;
  label: string;
  note: string;
  model: string;
  tag?: string;
}) {
  return (
    <li className="flex items-start gap-2.5">
      {icon}
      <div className="min-w-0">
        <p className="text-chalk-dim">
          <span className="text-chalk">{label}</span> — {note}
        </p>
        <p className="mt-0.5 truncate font-mono text-[11px] text-chalk-faint">
          {model}
          {tag ? ` · ${tag}` : ""}
        </p>
      </div>
    </li>
  );
}
