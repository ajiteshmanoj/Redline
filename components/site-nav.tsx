import Link from "next/link";
import { Wordmark } from "./brand";
import { Button } from "./ui/button";

export function SiteNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-ink/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
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
