"use client";

import { useEffect, useState } from "react";

export default function MobileSigiSplash() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 6500);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  const tickers = [
    "AAPL +0.84%",
    "NVDA +1.42%",
    "TSLA -0.31%",
    "QQQ +0.22%",
    "SPY +0.18%",
    "META +0.66%",
    "AMZN +0.39%",
  ];

  return (
    <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center overflow-hidden bg-black text-white md:hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.16),transparent_42%)]" />

      <div className="absolute left-0 top-0 w-full overflow-hidden border-b border-cyan-400/20 bg-black/80 py-2">
        <div className="animate-[tickerScroll_18s_linear_infinite] whitespace-nowrap text-xs font-semibold tracking-[0.25em] text-cyan-300">
          {[...tickers, ...tickers, ...tickers].map((item, index) => (
            <span key={index} className="mx-5">
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="relative flex flex-col items-center px-6 text-center">
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-cyan-300/70 shadow-[0_0_32px_rgba(34,211,238,0.65)]">
          <div className="text-5xl font-light text-cyan-200 drop-shadow-[0_0_16px_rgba(103,232,249,0.9)]">
            +
          </div>
        </div>

        <div className="mb-4 text-xs font-bold tracking-[0.55em] text-cyan-300">
          SIGI
        </div>

        <h1 className="mb-4 text-3xl font-bold tracking-[0.16em] text-white">
          Loading Today
        </h1>

        <p className="max-w-xs text-sm leading-6 text-cyan-100/70">
          Sigi is scanning the market and building your Today view.
        </p>
      </div>

      <style jsx global>{`
        @keyframes tickerScroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}