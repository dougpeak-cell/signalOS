"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type FeedCard = {
  key: string;
  title: string;
  body: string;
  href: string;
  eyebrow?: string;
  toneClassName: string;
  meta?: string;
  isLive?: boolean;
};

function buildThumbMetrics(container: HTMLDivElement | null) {
  if (!container) {
    return {
      widthPercent: 100,
      offsetPercent: 0,
    };
  }

  const { clientWidth, scrollLeft, scrollWidth } = container;

  if (scrollWidth <= clientWidth || clientWidth <= 0) {
    return {
      widthPercent: 100,
      offsetPercent: 0,
    };
  }

  const widthPercent = Math.max(18, (clientWidth / scrollWidth) * 100);
  const maxOffset = 100 - widthPercent;
  const offsetPercent = maxOffset * (scrollLeft / (scrollWidth - clientWidth));

  return {
    widthPercent,
    offsetPercent,
  };
}

export default function TodayBottomIntelRailScroller({
  feedCards,
}: {
  feedCards: FeedCard[];
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [thumbMetrics, setThumbMetrics] = useState({
    widthPercent: 100,
    offsetPercent: 0,
  });

  useEffect(() => {
    const container = scrollerRef.current;
    if (!container) return;

    const syncThumb = () => {
      setThumbMetrics(buildThumbMetrics(container));
    };

    syncThumb();
    container.addEventListener("scroll", syncThumb, { passive: true });

    const resizeObserver = new ResizeObserver(syncThumb);
    resizeObserver.observe(container);

    window.addEventListener("resize", syncThumb);

    return () => {
      container.removeEventListener("scroll", syncThumb);
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncThumb);
    };
  }, [feedCards.length]);

  return (
    <>
      <div ref={scrollerRef} className="signalos-hide-scrollbar flex gap-3 overflow-x-auto pb-1">
        {feedCards.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="min-w-70 rounded-2xl border border-white/10 bg-white/3 p-4 transition hover:border-cyan-400/20 hover:bg-cyan-400/4"
          >
            {item.eyebrow ? (
              <div className="mb-2 flex items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${item.toneClassName}`}>
                  {item.eyebrow}
                </span>
                {item.isLive ? (
                  <span className="text-[10px] uppercase tracking-[0.14em] text-white/35">
                    Live
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="text-sm font-medium text-white">{item.title}</div>
            <p className="mt-2 text-sm text-white/55">{item.body}</p>

            {item.meta ? (
              <div className="mt-3 text-[10px] uppercase tracking-[0.14em] text-white/38">
                {item.meta}
              </div>
            ) : null}
          </Link>
        ))}
      </div>

      <div className="mt-3 h-1.5 w-full rounded-full bg-cyan-400/10 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.08)]">
        <div
          className="h-full rounded-full bg-linear-to-r from-cyan-300/80 via-cyan-400/75 to-emerald-300/70 shadow-[0_0_16px_rgba(34,211,238,0.2)] transition-[width,transform] duration-150 ease-out"
          style={{
            width: `${thumbMetrics.widthPercent}%`,
            transform: `translateX(${thumbMetrics.offsetPercent}%)`,
          }}
        />
      </div>
    </>
  );
}
