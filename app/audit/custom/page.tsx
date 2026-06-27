"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuditExperience } from "@/components/audit-experience";
import { TARGET_STORAGE_KEY, type StoredTarget } from "@/components/custom-target-form";

export default function CustomAuditPage() {
  const router = useRouter();
  const [stored, setStored] = useState<StoredTarget | null | "missing">(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(TARGET_STORAGE_KEY);
      if (!raw) {
        setStored("missing");
        router.replace("/audit/new");
        return;
      }
      setStored(JSON.parse(raw) as StoredTarget);
    } catch {
      setStored("missing");
      router.replace("/audit/new");
    }
  }, [router]);

  if (stored === null || stored === "missing") return null;

  // A pasted/extracted prompt can be hardened, so prove-the-fix is enabled; an
  // external HTTP black box cannot be hardened in place, so it isn't.
  if (stored.kind === "prompt") {
    return (
      <AuditExperience
        run={{ prompt: stored.prompt }}
        title={stored.prompt.name || "Your bot"}
        subtitle="live audit"
        allowProve
        benchmark={{ name: stored.prompt.name || "Your bot", source: stored.prompt.source }}
      />
    );
  }

  return (
    <div data-tour="result">
      <AuditExperience
        run={{ target: stored.http }}
        title={stored.http.name || "Live target"}
        subtitle="live audit"
        allowProve={false}
        benchmark={{ name: stored.http.name || "Live target", source: "http" }}
      />
    </div>
  );
}
