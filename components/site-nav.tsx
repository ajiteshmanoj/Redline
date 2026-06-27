"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wordmark } from "./brand";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* full-width chrome — present at the top, fades out on scroll */}
      <div
        className={cn(
          "absolute inset-0 border-b border-border/70 bg-ink/80 backdrop-blur-xl transition-opacity duration-300",
          scrolled ? "opacity-0" : "opacity-100",
        )}
      />
      {/* the bar — collapses into a floating, translucent pill on scroll */}
      <div
        className={cn(
          "relative mx-auto flex items-center justify-between transition-all duration-300 ease-out",
          scrolled
            ? "mt-3 max-w-5xl rounded-full border border-border bg-white/70 px-5 py-2 shadow-soft backdrop-blur-xl"
            : "max-w-7xl px-6 py-3.5",
        )}
      >
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-9 md:flex">
          <Link href="/#how" className="text-sm text-chalk-dim transition-colors hover:text-chalk">
            How it works
          </Link>
          <Link
            href="/#attacks"
            className="text-sm text-chalk-dim transition-colors hover:text-chalk"
          >
            Attack suite
          </Link>
          <Link href="/#who" className="text-sm text-chalk-dim transition-colors hover:text-chalk">
            Who it&apos;s for
          </Link>
        </nav>
        <Link href="/audit">
          <Button size="sm">Run a live audit</Button>
        </Link>
      </div>
    </header>
  );
}
