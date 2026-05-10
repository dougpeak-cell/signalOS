"use client";

import { useMemo, useState } from "react";

const DAILY_SCRIPTURES = [
  {
    reference: "Matthew 25:21",
    verse:
      "Well done, good and faithful servant. You have been faithful over a little; I will set you over much.",
    message:
      "Wise investing is stewardship. Small faithful decisions today can grow into greater responsibility tomorrow.",
  },
  {
    reference: "Matthew 28:20",
    verse:
      "And surely I am with you always, to the very end of the age.",
    message:
      "Character is most important. Great investors understand patience, discipline, and staying steady through uncertainty.",
  },
  {
    reference: "Philippians 4:13",
    verse:
      "I can do all things through Christ who strengthens me.",
    message:
      "Confidence is built through preparation, discipline, and faith. Strong investors remain focused during both success and adversity.",
  },
  {
    reference: "Matthew 6:33",
    verse:
      "But seek first His kingdom and His righteousness, and all these things will be given to you as well.",
    message:
      "True wealth begins with priorities. Investors with strong character focus on wisdom, patience, and purpose before profit.",
  },
  {
    reference: "Isaiah 41:10",
    verse:
      "Fear not, for I am with you; be not dismayed, for I am your God.",
    message:
      "Markets can create fear and uncertainty. Strong investors remain calm, patient, and grounded through difficult seasons.",
  },
];

function getDailyHealthyWealth() {
  const now = new Date();

  // Daily reset at 5:00 AM local time.
  const resetDate = new Date(now);
  if (now.getHours() < 5) {
    resetDate.setDate(resetDate.getDate() - 1);
  }

  const dayKey = Math.floor(resetDate.getTime() / (1000 * 60 * 60 * 24));
  const index = dayKey % DAILY_SCRIPTURES.length;

  return DAILY_SCRIPTURES[index];
}

export default function HealthyWealthButton() {
  const [open, setOpen] = useState(false);
  const daily = useMemo(() => getDailyHealthyWealth(), []);

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
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/4 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Investor Character
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-200">{daily.message}</p>
          </div>
          <div className="mt-4 text-xs text-slate-500">Refreshes daily at 5:00 AM.</div>
        </div>
      ) : null}
    </div>
  );
}