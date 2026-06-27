import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] transition-colors",
  {
    variants: {
      variant: {
        neutral: "border-border bg-black/[0.03] text-chalk-dim",
        danger: "border-redline/30 bg-redline/[0.08] text-redline",
        safe: "border-safe/30 bg-safe/[0.10] text-safe",
        warn: "border-warn/30 bg-warn/[0.10] text-warn",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
