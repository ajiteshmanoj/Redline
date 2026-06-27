"use client";

import { cn } from "@/lib/utils";

// Animated gradient-mesh "aurora" — slow drifting colored blobs behind the
// hero. Pure CSS transforms, GPU-cheap, looks expensive.
export function Aurora({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <div className="absolute -left-1/4 top-[-20%] h-[60vh] w-[60vh] rounded-full bg-redline/25 blur-[120px] [animation:aurora-a_18s_ease-in-out_infinite]" />
      <div className="absolute right-[-10%] top-[5%] h-[55vh] w-[55vh] rounded-full bg-[#7c3bff]/15 blur-[130px] [animation:aurora-b_22s_ease-in-out_infinite]" />
      <div className="absolute bottom-[-25%] left-[20%] h-[50vh] w-[50vh] rounded-full bg-redline/15 blur-[140px] [animation:aurora-c_26s_ease-in-out_infinite]" />
    </div>
  );
}
