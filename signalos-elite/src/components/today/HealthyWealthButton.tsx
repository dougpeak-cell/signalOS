"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const DAILY_SCRIPTURE_RESET_HOUR = 4;

const DAILY_SCRIPTURES = [
  {
    reference: "Matthew 25:21",
    verse:
      "Well done, good and faithful servant. You have been faithful over a little; I will set you over much.",
    principle: "Faithful small decisions create long-term wealth.",
    message:
      "Wise investing is stewardship. Small faithful decisions today can grow into greater responsibility tomorrow.",
  },
  {
    reference: "Matthew 28:20",
    verse:
      "And surely I am with you always, to the very end of the age.",
    principle: "Steady character matters more than short-term outcomes.",
    message:
      "Character is most important. Great investors understand patience, discipline, and staying steady through uncertainty.",
  },
  {
    reference: "Philippians 4:13",
    verse:
      "I can do all things through Christ who strengthens me.",
    principle: "Prepared confidence beats reactive conviction.",
    message:
      "Confidence is built through preparation, discipline, and faith. Strong investors remain focused during both success and adversity.",
  },
  {
    reference: "Matthew 6:33",
    verse:
      "But seek first His kingdom and His righteousness, and all these things will be given to you as well.",
    principle: "Clear priorities protect long-term decisions.",
    message:
      "True wealth begins with priorities. Investors with strong character focus on wisdom, patience, and purpose before profit.",
  },
  {
    reference: "Isaiah 41:10",
    verse:
      "Fear not, for I am with you; be not dismayed, for I am your God.",
    principle: "Calm decisions outperform fear-driven moves.",
    message:
      "Markets can create fear and uncertainty. Strong investors remain calm, patient, and grounded through difficult seasons.",
  },
  {
    reference: "2 Corinthians 9:8",
    verse:
      "And God is able to bless you abundantly, so that in all things at all times, having all that you need, you will abound in every good work.",
    principle: "Healthy wealth grows so it can serve beyond itself.",
    message:
      "Healthy wealth is not only about growth - it is about being prepared, generous, and able to create positive impact for others.",
  },
  {
    reference: "1 Corinthians 16:13",
    verse:
      "Be on your guard; stand firm in the faith; be courageous; be strong.",
    principle: "Patience compounds faster than emotion.",
    message:
      "Great investors stay alert, disciplined, and emotionally steady. Strength and patience are critical during volatile markets.",
  },
  {
    reference: "Proverbs 11:25",
    verse:
      "A generous person will prosper; whoever refreshes others will be refreshed.",
    message:
      "Healthy wealth is not built only for ourselves. True prosperity grows through generosity, encouragement, and helping others succeed.",
    principle:
      "Long-term wealth has greater purpose when it positively impacts others.",
  },
  {
    reference: "Proverbs 13:11",
    verse:
      "Dishonest money dwindles away, but whoever gathers money little by little makes it grow.",
    message:
      "Healthy wealth is built patiently over time. Consistency, discipline, and long-term thinking are stronger than chasing quick gains.",
    principle:
      "Compounding rewards patience more than emotion.",
  },
  {
    reference: "Proverbs 10:14",
    verse:
      "Wise people store up knowledge, but the mouth of a fool invites ruin.",
    principle: "Knowledge compounds before wealth does.",
    message:
      "Strong investors prepare before they act. Wisdom, patience, and discipline create stability when markets become emotional or uncertain.",
  },
];

function getDailyHealthyWealth() {
  const now = new Date();

  // Daily reset at 4:00 AM local time.
  const resetDate = new Date(now);
  if (now.getHours() < DAILY_SCRIPTURE_RESET_HOUR) {
    resetDate.setDate(resetDate.getDate() - 1);
  }

  const dayKey = Math.floor(resetDate.getTime() / (1000 * 60 * 60 * 24));
  const index = dayKey % DAILY_SCRIPTURES.length;

  return DAILY_SCRIPTURES[index];
}

function getNextDailyResetTime() {
  const now = new Date();
  const nextReset = new Date(now);

  nextReset.setHours(DAILY_SCRIPTURE_RESET_HOUR, 0, 0, 0);

  if (now.getHours() >= DAILY_SCRIPTURE_RESET_HOUR) {
    nextReset.setDate(nextReset.getDate() + 1);
  }

  return nextReset;
}

function useDailyHealthyWealth() {
  const [daily, setDaily] = useState(() => getDailyHealthyWealth());

  useEffect(() => {
    setDaily(getDailyHealthyWealth());

    const nextReset = getNextDailyResetTime();
    const timeoutMs = Math.max(nextReset.getTime() - Date.now(), 1000);

    const timeoutId = window.setTimeout(() => {
      setDaily(getDailyHealthyWealth());
    }, timeoutMs);

    return () => window.clearTimeout(timeoutId);
  }, [daily.reference]);

  return daily;
}

export default function HealthyWealthButton() {
  const [open, setOpen] = useState(false);
  const daily = useDailyHealthyWealth();

  return (
    <div className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.18)] transition hover:bg-emerald-500/20"
      >
        Healthy Wealth
      </button>

      {open ? (
        <div className="absolute left-0 z-50 mt-3 w-90 max-w-[calc(100vw-2rem)] rounded-3xl border border-emerald-400/25 bg-slate-950/95 p-5 shadow-2xl backdrop-blur">
          <div className="mb-2 text-xs uppercase tracking-[0.24em] text-emerald-300/80">
            Daily Scripture
          </div>
          <div className="text-lg font-bold text-white">{daily.reference}</div>
          <p className="mt-3 text-sm leading-6 text-slate-200">&ldquo;{daily.verse}&rdquo;</p>
          <div className="mt-4 rounded-2xl border border-blue-400/20 bg-blue-500/6 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-blue-300">
              Today&apos;s Principle
            </div>

            <p className="mt-2 text-sm text-slate-200">{daily.principle}</p>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/4 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Investor Character
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-200">{daily.message}</p>
          </div>
          <Link
            href="/about"
            className="mt-5 inline-flex w-full items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
          >
            Our Mission
          </Link>
          <div className="mt-4 text-xs text-slate-500">Refreshes daily at 4:00 AM.</div>
        </div>
      ) : null}
    </div>
  );
}

export function MobileHealthyWealthButton() {
  const [open, setOpen] = useState(false);
  const daily = useDailyHealthyWealth();

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-9 items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.14)] transition hover:bg-emerald-500/20"
      >
        Healthy Wealth
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close Healthy Wealth panel"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px]"
          />
          <div className="fixed inset-x-3 top-14 z-60 max-h-[calc(100vh-4.5rem)] overflow-y-auto rounded-3xl border border-emerald-400/25 bg-slate-950/95 p-5 shadow-2xl backdrop-blur">
            <div className="mb-2 text-xs uppercase tracking-[0.24em] text-emerald-300/80">
              Daily Scripture
            </div>
            <div className="text-lg font-bold text-white">{daily.reference}</div>
            <p className="mt-3 text-sm leading-6 text-slate-200">&ldquo;{daily.verse}&rdquo;</p>
            <div className="mt-4 rounded-2xl border border-blue-400/20 bg-blue-500/6 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-blue-300">
                Today&apos;s Principle
              </div>

              <p className="mt-2 text-sm text-slate-200">{daily.principle}</p>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/4 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Investor Character
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-200">{daily.message}</p>
            </div>
            <Link
              href="/about"
              onClick={() => setOpen(false)}
              className="mt-5 inline-flex w-full items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
            >
              Our Mission
            </Link>
            <div className="mt-4 text-xs text-slate-500">Refreshes daily at 4:00 AM.</div>
          </div>
        </>
      ) : null}
    </div>
  );
}