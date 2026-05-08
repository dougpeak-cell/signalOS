"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const TODAY_AUTO_REFRESH_INTERVAL_MS = 60_000;

export default function TodayAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, TODAY_AUTO_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(refreshTimer);
    };
  }, [router]);

  return null;
}