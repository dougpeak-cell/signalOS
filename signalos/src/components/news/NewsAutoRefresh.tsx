"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

function getRefreshMs(): number {
  const now = new Date();

  const ny = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);

  const weekday = ny.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hour = Number(ny.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(ny.find((p) => p.type === "minute")?.value ?? "0");
  const totalMinutes = hour * 60 + minute;
  const isWeekday = !["Sat", "Sun"].includes(weekday);

  if (!isWeekday) return 25000;              // weekend
  if (totalMinutes >= 570 && totalMinutes < 960) return 10000; // 9:30–16:00 ET
  if (totalMinutes >= 240 && totalMinutes < 570) return 15000; // premarket
  if (totalMinutes >= 960 && totalMinutes < 1200) return 15000; // after hours
  return 25000;                               // overnight
}

const NewsAutoRefresh: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    const tick = () => router.refresh();
    const run = () => setTimeout(() => {
      tick();
      run();
    }, getRefreshMs());

    const timer = run();
    return () => clearTimeout(timer as unknown as number);
  }, [router]);

  return (
    <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
      Auto-refresh · smart
    </div>
  );
};

export default NewsAutoRefresh;
