"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const TODAY_AUTO_REFRESH_INTERVAL_MS = 60_000;

export default function TodayAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    let refreshTimer: number | null = null;

    const refresh = () => {
      router.refresh();
    };

    const onFocus = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    refreshTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }, TODAY_AUTO_REFRESH_INTERVAL_MS);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (refreshTimer != null) {
        window.clearInterval(refreshTimer);
      }
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);

  return null;
}