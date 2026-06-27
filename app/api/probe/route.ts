import { NextRequest, NextResponse } from "next/server";
import { callHttpTarget } from "@/lib/http-target";
import type { HttpTargetConfig } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Single test message against a configured target — powers the form's
// "Test connection" button so users can validate a target before auditing.
export async function POST(req: NextRequest) {
  const { target, message } = (await req.json().catch(() => ({}))) as {
    target?: HttpTargetConfig;
    message?: string;
  };
  if (!target?.endpoint) {
    return NextResponse.json({ ok: false, error: "Endpoint is required." }, { status: 400 });
  }
  try {
    const reply = await callHttpTarget(target, message || "Hi, what can you help me with?");
    const ok = !/^\[target (error|returned|unreachable)/i.test(reply);
    return NextResponse.json({ ok, reply });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message });
  }
}
