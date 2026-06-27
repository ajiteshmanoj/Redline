import { notFound } from "next/navigation";
import { getBot, BOTS } from "@/lib/bots";
import { AuditExperience } from "@/components/audit-experience";

export function generateStaticParams() {
  return BOTS.map((b) => ({ botId: b.id }));
}

export default function AuditRunPage({ params }: { params: { botId: string } }) {
  const bot = getBot(params.botId);
  if (!bot) notFound();
  return (
    <AuditExperience
      run={{ botId: bot.id }}
      title={bot.business}
      subtitle={bot.name}
      allowProve
      financial={bot.financial}
    />
  );
}
