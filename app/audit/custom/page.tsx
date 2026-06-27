"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { HttpTargetConfig } from "@/lib/types";
import { AuditExperience } from "@/components/audit-experience";
import { TARGET_STORAGE_KEY } from "@/components/custom-target-form";

export default function CustomAuditPage() {
  const router = useRouter();
  const [target, setTarget] = useState<HttpTargetConfig | null | "missing">(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(TARGET_STORAGE_KEY);
      if (!raw) {
        setTarget("missing");
        router.replace("/audit/new");
        return;
      }
      setTarget(JSON.parse(raw) as HttpTargetConfig);
    } catch {
      setTarget("missing");
      router.replace("/audit/new");
    }
  }, [router]);

  if (target === null || target === "missing") return null;

  return (
    <AuditExperience
      run={{ target }}
      title={target.name || "Live target"}
      subtitle="live audit"
      allowProve={false}
    />
  );
}
