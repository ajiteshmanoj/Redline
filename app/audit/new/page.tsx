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
            Red-team your own bot.
          </h1>
          <p className="mt-4 text-lg text-chalk-dim">
            Three ways in: paste your <span className="text-chalk">system prompt</span>, point Redline
            at a <span className="text-chalk">public GitHub repo</span> and let it find the prompt, or
            give it a live <span className="text-chalk">HTTP endpoint</span>. It fires the real attack
            battery and reports exactly where your bot breaks. No fixtures, no script.
          </p>
        </div>

        <CustomTargetForm />
      </div>
    </main>
  );
}
