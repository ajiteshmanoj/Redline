"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Swords } from "lucide-react";
import type { Bot } from "@/lib/types";
import { Button } from "./ui/button";
import { categoryMap } from "@/lib/attacks";
import { categoryVisual } from "./category-meta";

export function BotCard({ bot, index }: { bot: Bot; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 * index, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="group panel grain relative flex flex-col overflow-hidden p-6 transition-colors hover:border-redline/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-white/[0.04] font-display text-sm font-semibold text-chalk-dim">
            {bot.avatarInitials}
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold leading-tight">{bot.business}</h3>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-chalk-faint">
              {bot.sector}
            </p>
          </div>
        </div>
        {bot.independent ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-safe/40 bg-safe/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-safe">
            <ShieldCheck className="h-3.5 w-3.5" /> Not rigged
          </span>
        ) : null}
      </div>

      <p className="mt-4 flex-1 text-sm leading-relaxed text-chalk-dim">{bot.blurb}</p>

      <div className="mt-5">
        <p className="mono-label mb-2">{bot.independent ? "We'll probe for" : "Likely weak to"}</p>
        <div className="flex flex-wrap gap-1.5">
          {bot.weakSpots.map((id) => {
            const Icon = categoryVisual[id].icon;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/[0.03] px-2.5 py-1 text-xs text-chalk-dim"
              >
                <Icon className="h-3.5 w-3.5 text-redline/80" />
                {categoryMap[id].short}
              </span>
            );
          })}
        </div>
      </div>

      <Link href={`/audit/${bot.id}`} className="mt-6">
        <Button className="group/btn w-full">
          Run Redline audit
          <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
        </Button>
      </Link>
      <Link
        href={`/audit/${bot.id}/adaptive`}
        className="group/adapt mt-2.5 inline-flex w-full items-center justify-center gap-1.5 text-xs font-medium text-chalk-faint transition-colors hover:text-redline-bright"
      >
        <Swords className="h-3.5 w-3.5" />
        or unleash the adaptive agent
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/adapt:translate-x-0.5" />
      </Link>
    </motion.div>
  );
}
