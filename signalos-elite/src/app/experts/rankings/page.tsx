import Link from "next/link";
import SigiAnalystLeaders from "@/components/experts/SigiAnalystLeaders";

export default function ExpertRankingsPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-5 py-10">
        <Link
          href="/experts"
          className="mb-8 inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
        >
          ← Back to Experts
        </Link>

        <p className="text-xs font-bold uppercase tracking-[0.35em] text-cyan-300">
          SIGIOS PRO
        </p>

        <h1 className="mt-3 text-4xl font-black">Sigi Analyst Leaders</h1>

        <p className="mt-3 max-w-3xl text-slate-400">
          Sector-ranked analyst intelligence selected by Sigi from real analyst
          flow, conviction, coverage quality, recency, success rate, and return
          consistency.
        </p>

        <div className="mt-8">
          <SigiAnalystLeaders />
        </div>
      </div>
    </main>
  );
}