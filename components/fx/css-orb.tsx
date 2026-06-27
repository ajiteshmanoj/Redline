"use client";

// Pure-CSS "agent under test" orb. Used as the WebGL fallback (and what shows
// on machines without a GPU). Concentric rotating rings, a pulsing red core, a
// sweeping scan line and orbiting nodes — cinematic with zero WebGL.
export function CssAgentOrb() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div className="relative aspect-square w-[min(78vh,640px)]">
        {/* glow core */}
        <div className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(255,59,59,0.55),rgba(255,59,59,0.12)_45%,transparent_70%)] blur-2xl" />
        <div className="absolute inset-[34%] rounded-full bg-[radial-gradient(circle,rgba(255,120,120,0.9),rgba(255,59,59,0.25)_60%,transparent)] blur-md [animation:orb-pulse_3.4s_ease-in-out_infinite]" />

        {/* dotted sphere texture via repeating radial-gradient masked to a circle */}
        <div
          className="absolute inset-[12%] rounded-full opacity-70 [animation:spin-slow_40s_linear_infinite]"
          style={{
            background:
              "radial-gradient(rgba(159,176,201,0.5) 1px, transparent 1.4px) 0 0 / 14px 14px",
            WebkitMaskImage:
              "radial-gradient(circle at 50% 50%, black 58%, transparent 72%)",
            maskImage: "radial-gradient(circle at 50% 50%, black 58%, transparent 72%)",
          }}
        />

        {/* rotating conic ring 1 */}
        <Ring inset="6%" duration="18s" reverse={false} from="rgba(255,59,59,0.0)" to="rgba(255,59,59,0.85)" />
        {/* rotating conic ring 2 */}
        <Ring inset="-2%" duration="28s" reverse to="rgba(159,176,201,0.5)" from="rgba(159,176,201,0)" thin />

        {/* crosshair */}
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-redline/20 to-transparent" />
        <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-gradient-to-r from-transparent via-redline/20 to-transparent" />

        {/* sweeping scan line */}
        <div className="absolute inset-[6%] overflow-hidden rounded-full">
          <div className="absolute inset-x-0 h-[36%] bg-gradient-to-b from-redline/25 via-redline/5 to-transparent [animation:scan-sweep_3s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
        </div>

        {/* orbiting nodes */}
        <div className="absolute inset-0 [animation:spin-slow_14s_linear_infinite]">
          <Node className="left-1/2 top-[3%] bg-redline shadow-[0_0_14px_3px_rgba(255,59,59,0.8)]" />
          <Node className="left-[8%] top-1/2 bg-safe shadow-[0_0_12px_2px_rgba(55,201,139,0.7)]" />
        </div>
        <div className="absolute inset-0 [animation:spin-slow_22s_linear_infinite_reverse]">
          <Node className="right-[6%] top-[28%] bg-chalk-dim" />
          <Node className="left-[20%] bottom-[10%] bg-redline shadow-[0_0_12px_2px_rgba(255,59,59,0.7)]" />
        </div>
      </div>
    </div>
  );
}

function Ring({
  inset,
  duration,
  reverse,
  from,
  to,
  thin,
}: {
  inset: string;
  duration: string;
  reverse?: boolean;
  from: string;
  to: string;
  thin?: boolean;
}) {
  const w = thin ? 1 : 2;
  return (
    <div
      className="absolute rounded-full"
      style={{
        inset,
        padding: w,
        background: `conic-gradient(from 0deg, ${from}, ${to}, ${from})`,
        WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
        animation: `spin-slow ${duration} linear infinite${reverse ? " reverse" : ""}`,
      }}
    />
  );
}

function Node({ className }: { className: string }) {
  return <span className={`absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${className}`} />;
}
