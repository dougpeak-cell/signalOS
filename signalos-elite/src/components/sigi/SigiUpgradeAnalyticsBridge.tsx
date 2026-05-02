"use client";

import { useEffect } from "react";

type UpgradeReason = "depth" | "memory" | "research" | "proactive" | "automation";
type UpgradePromptSource = "rail_inline" | "rail_modal" | "rail_preview";

type SigiUpgradeAnalyticsDetail = {
  event: "sigi_upgrade_trigger_shown" | "sigi_upgrade_clicked" | "sigi_upgrade_dismissed";
  tierTarget: "smart" | "pro";
  reason: UpgradeReason;
  source?: UpgradePromptSource;
};

function forwardAnalytics(detail: SigiUpgradeAnalyticsDetail) {
  const body = JSON.stringify(detail);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon("/api/analytics/sigi-upgrade", blob)) {
      return;
    }
  }

  void fetch("/api/analytics/sigi-upgrade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  });
}

export default function SigiUpgradeAnalyticsBridge() {
  useEffect(() => {
    function handleAnalytics(event: Event) {
      const custom = event as CustomEvent<SigiUpgradeAnalyticsDetail>;
      if (!custom.detail?.event || !custom.detail?.tierTarget || !custom.detail?.reason) {
        return;
      }

      forwardAnalytics(custom.detail);
    }

    window.addEventListener("signalos:sigi-upgrade-analytics", handleAnalytics as EventListener);
    return () => {
      window.removeEventListener("signalos:sigi-upgrade-analytics", handleAnalytics as EventListener);
    };
  }, []);

  return null;
}