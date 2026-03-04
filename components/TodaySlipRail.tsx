"use client";

import TopRailWithSlip from "@/components/TopRailWithSlip";

type Pick = {
  key: string;
  name: string;
  team?: string | null;
  opponent?: string | null;
  startTime?: string | null;
  market?: string;
  line?: number | null;
  proj?: number | null;
  edge?: number | null;
  confidencePct?: number | null;
  tier?: "Elite" | "Strong" | "Risk" | null;
  isElite?: boolean;
};

export default function TodaySlipRail({ items }: { items: Pick[] }) {
  return <TopRailWithSlip title="Today's Top Picks" items={items} />;
}
