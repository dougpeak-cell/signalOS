"use client";

import { useEffect, useState } from "react";
import { getCurrentMarketPhase } from "@/lib/today/marketPhase";

export default function CurrentMarketPhaseInline({
  fallback = "Session focus",
}: {
  fallback?: string;
}) {
  const [phase, setPhase] = useState(fallback);

  useEffect(() => {
    setPhase(getCurrentMarketPhase());
  }, []);

  return <>{phase}</>;
}