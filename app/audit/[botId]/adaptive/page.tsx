import { notFound } from "next/navigation";
import { getBot, BOTS } from "@/lib/bots";
import { AdaptiveExperience } from "@/components/adaptive-experience";

export function generateStaticParams() {
  return BOTS.map((b) => ({ botId: b.id }));
}

export default function AdaptiveRunPage({ params }: { params: { botId: string } }) {
  const bot = getBot(params.botId);
  if (!bot) notFound();
  return <AdaptiveExperience botId={bot.id} title={bot.business} />;
}
