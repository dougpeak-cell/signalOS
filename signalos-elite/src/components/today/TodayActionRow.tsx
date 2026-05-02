import TodayActionRowClient from "@/components/today/TodayActionRowClient";
import { getTodayActionRowMetrics } from "@/lib/today/actionRow";

export default async function TodayActionRow() {
  const metrics = await getTodayActionRowMetrics();

  return <TodayActionRowClient initialMetrics={metrics} />;
}