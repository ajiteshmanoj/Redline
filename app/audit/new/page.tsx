import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import { CustomTargetForm } from "@/components/custom-target-form";

export default function NewTargetPage() {
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
          <div className="mb-5 flex items-center gap-3">
            <p className="mono-label">Live target</p>
            <Badge variant="danger">Real audit</Badge>
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Point Redline at a live bot.
          </h1>
          <p className="mt-4 text-lg text-chalk-dim">
            Give Redline access to any chatbot that speaks JSON over HTTP — your own, a client&apos;s,
            or a deployed demo. It fires the real attack battery at the live endpoint and reports
            exactly where it breaks. No fixtures, no script.
          </p>
        </div>

        <CustomTargetForm />
      </div>
    </main>
  );
}
