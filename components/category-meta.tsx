import {
  Unlock,
  Syringe,
  Contact,
  Ghost,
  Megaphone,
  ShieldOff,
  type LucideIcon,
} from "lucide-react";
import type { AttackCategoryId } from "@/lib/types";

export const categoryVisual: Record<AttackCategoryId, { icon: LucideIcon }> = {
  jailbreak: { icon: Unlock },
  "prompt-injection": { icon: Syringe },
  "pii-extraction": { icon: Contact },
  hallucination: { icon: Ghost },
  "brand-damage": { icon: Megaphone },
  "policy-bypass": { icon: ShieldOff },
};
