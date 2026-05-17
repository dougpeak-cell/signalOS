"use client";

import { useMemo, useState } from "react";

const sectors = [
  "Technology",
  "Healthcare",
  "Financial Services",
  "Industrials",
  "Consumer Cyclical",
  "Consumer Defensive",
  "Energy",
  "Communication Services",
  "Utilities",
  "Real Estate",
  "Basic Materials",
];

const mockLeaders: Record<string, any> = {
  Technology: {
    analyst: "Sigi AI Leader",
    firm: "SigiOS Analyst Flow",
    sector: "Technology",
    successRate: "78%",
    avgReturn: "+26.7%",
    coveredNames: ["NVDA", "MSFT", "AAPL", "AVGO"],
    strongestCall: "NVDA",
    reason:
      "Sigi selected this leader because recent technology calls show strong AI infrastructure alignment, high conviction, and consistent upside capture across mega-cap software and semiconductor names.",
    risk:
      "Technology leadership can become crowded quickly. Watch valuation, earnings reaction, and rate pressure.",
  },
  Healthcare: {
    analyst: "Sigi AI Leader",
    firm: "SigiOS Analyst Flow",
    sector: "Healthcare",
    successRate: "72%",
    avgReturn: "+18.4%",
    coveredNames: ["LLY", "UNH", "ISRG", "VRTX"],
    strongestCall: "LLY",
    reason:
      "Sigi selected this healthcare leader for durable large-cap coverage, strong earnings revision trends, and consistent quality signals.",
    risk:
      "Healthcare setups can be sensitive to policy headlines, trial results, and reimbursement risk.",
  },
};

export default function SigiAnalystLeaders() {
  const [activeSector, setActiveSector] = useState("Technology");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiLeader, setAiLeader] = useState<any | null>(null);

  const fallbackLeader = {
    analyst: "Sigi AI Leader",
    firm: "SigiOS Analyst Flow",
    sector: activeSector,
    successRate: "—",
    avgReturn: "—",
    coveredNames: ["—"],
    strongestCall: "—",
    reason:
      "Sigi is ready to rank this sector once live analyst-flow data is connected.",
    risk: "No live analyst leader has been calculated yet for this sector.",
  };

  const leader = useMemo(() => {
    return aiLeader ?? mockLeaders[activeSector] ?? fallbackLeader;
  }, [activeSector, aiLeader]);

  const displayAnalyst = isDisclosureHidden(leader.analyst)
    ? "Sigi Sector Leader"
    : leader.analyst;
  const displayFirm = isDisclosureHidden(leader.firm)
    ? "Live analyst feed"
    : leader.firm;
  const displaySector = isDisclosureHidden(leader.sector) ? activeSector : leader.sector;
  const displayCoveredNames = normalizeCoveredNames(leader.coveredNames);
  const strongestCall = summarizeStrongestCall(leader.strongestCall);

  async function handleAskSigi() {
    const sector = input.trim() || activeSector;
    if (!sector) return;

    setLoading(true);

    try {
      const res = await fetch("/api/sigi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Rank the top analyst leader for the ${sector} sector.`,
          mode: "expert_analyst_leader",
          sector,
        }),
      });

      const data = await res.json();

      setAiLeader(data.intelligence ?? data.thesis ?? data);
      setActiveSector(sector);
    } catch (error) {
      console.error("Sigi analyst leader error:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-4xl border border-cyan-400/20 bg-[#020817] p-6 shadow-[0_0_60px_rgba(34,211,238,0.08)]">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-emerald-300">
            Sigi Analyst Command
          </p>
          <h2 className="mt-2 text-3xl font-black text-white sm:text-[2rem]">
            Top Analyst by Sector
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Type a sector or select below. Sigi ranks analyst leadership using
            success rate, return consistency, recency, conviction, and sector fit.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-96 2xl:w-105">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAskSigi();
            }}
            placeholder="Type sector, example: Technology"
            className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/50"
          />
          <button
            onClick={handleAskSigi}
            disabled={loading}
            className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-black hover:bg-cyan-200 disabled:opacity-50"
          >
            {loading ? "Sigi thinking..." : "Ask Sigi"}
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {sectors.map((sector) => (
          <button
            key={sector}
            onClick={() => {
              setAiLeader(null);
              setActiveSector(sector);
            }}
            className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] transition ${
              activeSector === sector
                ? "border-cyan-300 bg-cyan-300/15 text-cyan-100"
                : "border-white/10 bg-white/5 text-slate-400 hover:border-cyan-300/30 hover:text-white"
            }`}
          >
            {sector}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-emerald-300/20 bg-emerald-300/6 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">
                Sigi Pick
              </p>
              <h3 className="mt-3 wrap-break-word text-2xl font-black text-white sm:text-3xl">
                {displayAnalyst}
              </h3>
              <p className="mt-1 wrap-break-word text-sm text-slate-400">
                {displayFirm} · {displaySector}
              </p>
            </div>

            <div className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-xs font-black text-emerald-200">
              PRO
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Stat label="Success Rate" value={leader.successRate} />
            <Stat label="Avg Return" value={leader.avgReturn} />
            <Stat label="Strongest Call" value={strongestCall} />
          </div>

          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
              Covered Names
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {displayCoveredNames.map((ticker) => (
                <span
                  key={ticker}
                  className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100"
                >
                  {ticker}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/4 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
            Why Sigi Selected This
          </p>

          <p className="mt-4 text-sm leading-7 text-slate-300">
            {leader.reason}
          </p>

          <div className="mt-6 rounded-2xl border border-orange-300/20 bg-orange-300/6 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-200">
              Risk Note
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {leader.risk}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const hidden = isDisclosureHidden(value);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 wrap-break-word text-xl font-black text-white sm:text-2xl">{hidden ? "—" : value}</p>
      {hidden ? (
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Not disclosed
        </p>
      ) : null}
    </div>
  );
}

function isDisclosureHidden(value: unknown) {
  if (typeof value !== "string") return false;

  const normalized = value.trim().toLowerCase();
  return (
    normalized === "" ||
    normalized === "—" ||
    normalized === "not disclosed" ||
    normalized === "n/a"
  );
}

function summarizeStrongestCall(value: unknown) {
  if (typeof value !== "string") return "—";

  const trimmed = value.trim();
  if (isDisclosureHidden(trimmed)) return "—";

  const tickerMatch = trimmed.match(/\(([A-Z]{1,5})\)/);
  if (tickerMatch) return tickerMatch[1];

  return trimmed.length > 28 ? `${trimmed.slice(0, 25)}...` : trimmed;
}

function normalizeCoveredNames(value: unknown) {
  if (!Array.isArray(value)) {
    return ["No names disclosed"];
  }

  const names = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && !isDisclosureHidden(item));

  if (names.length === 0) {
    return ["No names disclosed"];
  }

  return names.map((name) => {
    const tickerMatch = name.match(/\(([A-Z]{1,5})\)/);
    if (tickerMatch) return tickerMatch[1];

    return name.length > 26 ? `${name.slice(0, 23)}...` : name;
  });
}