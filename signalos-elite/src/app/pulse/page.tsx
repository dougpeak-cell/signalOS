import type { Metadata } from "next";
import MobilePulseExperience from "@/components/mobile/MobilePulseExperience";

export const metadata: Metadata = {
  title: "Sigi Pulse | SigiOS",
  description: "Search a stock and discover its verified AMSA Pulse, Heartbeat, and market DNA. No account required for a first look.",
};

export default async function PulsePage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string | string[] }>;
}): Promise<React.ReactElement> {
  const { symbol } = await searchParams;
  return <MobilePulseExperience initialSymbol={typeof symbol === "string" ? symbol.slice(0, 12) : ""} />;
}