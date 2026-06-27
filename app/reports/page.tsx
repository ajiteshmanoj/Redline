import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SavedReportsView } from "@/components/saved-reports-view";

export default function ReportsPage() {
  return (
    <main className="relative min-h-screen pt-16">
      <SiteNav />
      <div className="absolute inset-0 -z-10 bg-grid bg-grid-fade opacity-30" />
      <div className="container py-16">
        <Link
          href="/audit"
          className="mb-8 inline-flex items-center gap-2 text-sm text-chalk-faint transition-colors hover:text-chalk"
        >
          <ArrowLeft className="h-4 w-4" /> Targets
        </Link>
        <div className="mb-10 max-w-2xl">
          <p className="mono-label mb-4">Saved findings</p>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Your audit reports.
          </h1>
          <p className="mt-4 text-lg text-chalk-dim">
            Every audit you save lands here — reopen the full report, export it, or generate a
            good-faith disclosure to send the company.
          </p>
        </div>
        <SavedReportsView />
      </div>
    </main>
  );
}
