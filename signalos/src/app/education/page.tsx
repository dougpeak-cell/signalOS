
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import PageHeaderBlock from "@/components/shell/PageHeaderBlock";

export default function EducationPage() {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const sections = [
    {
      title: "Demand Zone",
      text: "An area where buyers previously stepped in aggressively. Price often reacts upward when it returns to this zone.",
    },
    {
      title: "Supply Zone",
      text: "An area where sellers previously took control. Price may reject or stall when it revisits this level.",
    },
    {
      title: "VWAP",
      text: "Volume Weighted Average Price. A key institutional reference line used to judge fair intraday value.",
    },
    {
      title: "Confluence",
      text: "When multiple bullish or bearish signals align at the same time. More confluence usually means a stronger setup.",
    },
    {
      title: "Strength Score",
      text: "A measure of how powerful the setup appears based on structure, trend, confirmation, and momentum.",
    },
    {
      title: "Confidence",
      text: "A simplified signal quality rating that helps users quickly judge how actionable the setup may be.",
    },
    {
      title: "Liquidity",
      text: "Areas where stop losses and pending orders are likely clustered. Price often moves toward liquidity before reversing or continuing.",
    },
    {
      title: "Session High / Low",
      text: "Important intraday reference levels showing the highest and lowest prices reached during the current session.",
    },
    {
      title: "Premarket High / Low",
      text: "Key levels from premarket trading. These often act as reaction zones once the regular session opens.",
    },
    {
      title: "Previous Day High / Low",
      text: "Widely watched levels from the prior session. Traders often use these as breakout or rejection areas.",
    },
    {
      title: "Order Flow Zone",
      text: "A price area where buying or selling pressure appears concentrated, suggesting meaningful participation from larger traders.",
    },
    {
      title: "Auto Trade Brief",
      text: "A quick summary of the current idea, including potential entry, stop, targets, and the reason the setup matters.",
    },
  ];

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 xl:px-0">

        {/* Back Button */}
        <div className="sticky top-0 z-20 mb-4 flex justify-start bg-black/80 backdrop-blur-md py-2">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            ← Exit Education
          </button>
        </div>

        {/* Header */}
        <div className="mb-8 mt-4">
          <PageHeaderBlock
            title="Education"
            description="Learn the core terms, signals, and chart concepts used throughout SignalOS so you can read the platform with confidence."
            titleClassName="md:text-4xl"
            descriptionClassName="md:text-base"
          />
        </div>

        {/* How To Use */}
        <div className="mb-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5">
          <div className="text-sm font-semibold text-cyan-300">
            How To Read SignalOS
          </div>

          <div className="mt-3 space-y-2 text-sm text-white/70">
            <div>1. Look for High Confidence setups</div>
            <div>2. Confirm price is near demand or supply zones</div>
            <div>3. Check confluence stack alignment</div>
            <div>4. Review Auto Trade Brief levels</div>
            <div>5. Use chart to confirm entry timing</div>
          </div>
        </div>

        {/* Sections */}
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <div
              key={section.title}
              className="rounded-2xl border border-cyan-400/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(34,211,238,0.03)]"
            >
              <div className="text-sm font-semibold text-white md:text-base">
                {section.title}
              </div>

              <p className="mt-2 text-sm leading-6 text-white/65">
                {section.text}
              </p>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}
