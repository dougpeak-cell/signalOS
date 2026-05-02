"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isPreMarketNow } from "@/lib/today/marketPhase";
import type { TodaySetupSession } from "@/lib/today/pageData";

function getLiveSession(): TodaySetupSession {
  return isPreMarketNow() ? "pre" : "regular";
}

export default function SetupsSessionAutoSync({
  initialSession,
}: {
  initialSession: TodaySetupSession;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const syncSession = () => {
      const liveSession = getLiveSession();
      const sessionParam = searchParams.get("session");
      const renderedSession =
        sessionParam === "pre" || sessionParam === "regular"
          ? sessionParam
          : initialSession;

      if (renderedSession === liveSession) {
        return;
      }

      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("session", liveSession);
      const nextQuery = nextParams.toString();

      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    };

    syncSession();
    const intervalId = window.setInterval(syncSession, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [initialSession, pathname, router, searchParams]);

  return null;
}