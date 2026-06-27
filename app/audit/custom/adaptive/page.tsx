"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdaptiveExperience } from "@/components/adaptive-experience";
import { TARGET_STORAGE_KEY, type StoredTarget } from "@/components/custom-target-form";

export default function CustomAdaptivePage() {
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

  if (stored.kind === "prompt") {
    return <AdaptiveExperience prompt={stored.prompt} title={stored.prompt.name || "Your bot"} />;
  }

  return <AdaptiveExperience target={stored.http} title={stored.http.name || "Live target"} />;
}
