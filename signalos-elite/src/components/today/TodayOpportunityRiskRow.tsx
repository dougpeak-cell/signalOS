import TodayOpportunityPanel from "@/components/today/TodayOpportunityPanel";
import TodayRiskDashboardPanel from "@/components/today/TodayRiskDashboardPanel";
import type { TodayOpportunityItem, TodayRiskItem } from "@/lib/today/pageData";

export default function TodayOpportunityRiskRow({
  opportunities,
  risks,
}: {
  opportunities: TodayOpportunityItem[];
  risks: TodayRiskItem[];
}) {
  return (
    <section id="opportunity-risk" className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <TodayOpportunityPanel opportunities={opportunities} />
      <TodayRiskDashboardPanel risks={risks} />
    </section>
  );
}