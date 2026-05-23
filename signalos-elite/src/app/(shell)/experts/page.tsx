import Link from "next/link";
import Image from "next/image";
import {
  Brain,
  Briefcase,
  ChartNoAxesCombined,
  Eye,
  Lock,
  Search,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";
import SigiDesktopCTA from "@/components/mobile/SigiDesktopCTA";
import tradingWorkspaceScreenshot from "../../../public/Images/Chart/Screenshot 2026-05-20 175534.png";
import ExpertsProDashboard from "@/components/experts/ExpertsProDashboard";
import { getSigiSettingsViewForCurrentUser } from "@/lib/sigi/settings";

const PRO_DASHBOARD_HREF = "/experts/pro";
const SMART_PREVIEW_HREF = "/experts/smart";

export default async function ExpertsPage({
  searchParams,
}: {
  searchParams?: Promise<{ mobilePreview?: string }>;
}) {
  const settings = await getSigiSettingsViewForCurrentUser();
  const params = (await searchParams) ?? {};
  const isMobilePreview = params.mobilePreview === "1";

  if (settings.hasProFeatures) {
    return <ExpertsProDashboard />;
  }

  return (
    <main className={isMobilePreview ? "relative min-h-screen overflow-x-hidden bg-[#020617] px-3 py-6 text-white" : "relative min-h-screen overflow-x-hidden bg-[#020617] px-4 py-8 text-white md:px-8"}>
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[#020617]" />
        <div className="absolute left-[-18%] top-[-10%] h-275 w-275 rounded-full bg-cyan-500/10 blur-[180px]" />
        <div className="absolute right-[-18%] top-[18%] h-237.5 w-237.5 rounded-full bg-blue-500/10 blur-[190px]" />
        <div className="absolute bottom-[-25%] left-[18%] h-250 w-250 rounded-full bg-emerald-500/5 blur-[220px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,0.55)_100%)]" />
      </div>

      <section className="relative z-10">
        <div className={isMobilePreview ? "mx-auto max-w-xl space-y-6" : "mx-auto max-w-7xl space-y-8"}>
        <section className={isMobilePreview ? "rounded-3xl border border-cyan-400/20 bg-cyan-950/20 p-4 shadow-[0_0_40px_rgba(34,211,238,0.08)]" : "rounded-3xl border border-cyan-400/20 bg-cyan-950/20 p-6 shadow-[0_0_40px_rgba(34,211,238,0.08)] md:p-8"}>
          <div className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-cyan-300">
            SigiOS Access
          </div>

          <h1 className={isMobilePreview ? "max-w-[10ch] text-2xl font-bold leading-[1.05]" : "text-3xl font-bold md:text-5xl"}>
            Choose the intelligence level that fits your market workflow.
          </h1>

          <p className={isMobilePreview ? "mt-4 max-w-none text-sm leading-6 text-slate-300" : "mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base"}>
            Current users get Quick View access to Watchlist and Portfolio.
            Smart unlocks Sigi Personal Assistant, Watchlist intelligence, and
            Portfolio Read. Pro unlocks total Sigi Intelligence, including
            Experts and Screener.
          </p>
        </section>

        <SigiDesktopCTA />

        <section className={isMobilePreview ? "rounded-3xl border border-slate-700/70 bg-slate-950/70 p-4" : "rounded-3xl border border-slate-700/70 bg-slate-950/70 p-6"}>
          <div className="flex items-center gap-3">
            <Eye className="text-cyan-300" />
            <h2 className={isMobilePreview ? "text-xl font-bold" : "text-2xl font-bold"}>Current Users</h2>
          </div>

          <p className={isMobilePreview ? "mt-3 max-w-none text-sm leading-6 text-slate-300" : "mt-3 max-w-3xl text-sm leading-7 text-slate-300"}>
            Current users have Quick View access to SigiOS Watchlist and Sigi
            Portfolio so they can preview the market workflow before upgrading.
          </p>

          <div className={["mt-6 grid gap-4", isMobilePreview ? "" : "md:grid-cols-2"].join(" ")}>
            <FeatureCard
              compact={isMobilePreview}
              icon={<TrendingUp />}
              title="Quick View Watchlist"
              text="Preview selected stocks and market movement inside the SigiOS experience."
            />
            <FeatureCard
              compact={isMobilePreview}
              icon={<Briefcase />}
              title="Quick View Portfolio"
              text="Preview portfolio structure and idea tracking before unlocking deeper intelligence."
            />
          </div>
        </section>

        <section className={["grid gap-6", isMobilePreview ? "" : "lg:grid-cols-3"].join(" ")}>
          <PlanCard
            compact={isMobilePreview}
            badge="Current Access"
            title="Sigi"
            price="$0"
            subtitle="Quick View market access"
            features={[
              "Quick View Watchlist",
              "Quick View Portfolio",
              "Basic market navigation",
            ]}
            cta="Current Plan"
            href="/today"
          />

          <PlanCard
            compact={isMobilePreview}
            highlighted
            badge="Smart Users"
            title="Sigi Smart"
            price="$9.00"
            subtitle="Personal assistant + portfolio intelligence"
            features={[
              "Sigi Personal Assistant",
              "SigiOS Watchlist intelligence",
              "Sigi Portfolio Read",
              "Live pricing and SigiOS scoring",
              "Momentum context and chart access",
            ]}
            cta="Upgrade to Smart"
            href={SMART_PREVIEW_HREF}
          />

          <PlanCard
            compact={isMobilePreview}
            premium
            badge="Pro Users"
            title="Sigi Pro"
            price="$24.00"
            subtitle="Total access to Sigi Intelligence"
            features={[
              "Everything in Smart",
              "Sigi Experts",
              "Sigi Screener",
              "Analyst Top Picks Across the Market",
              "Institutional ownership trends",
            ]}
            cta="Reserve Pro Access"
            href={PRO_DASHBOARD_HREF}
          />
        </section>

        <section className={isMobilePreview ? "rounded-3xl border border-cyan-400/20 bg-slate-950/80 p-4" : "rounded-3xl border border-cyan-400/20 bg-slate-950/80 p-6 md:p-8"}>
          <div className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-cyan-300">
            Smart Access
          </div>

          <h2 className={isMobilePreview ? "text-2xl font-bold leading-tight" : "text-3xl font-bold"}>Sigi Smart unlocks your personal investing assistant.</h2>

          <p className={isMobilePreview ? "mt-4 max-w-none text-sm leading-6 text-slate-300" : "mt-4 max-w-4xl text-sm leading-7 text-slate-300 md:text-base"}>
            Smart users have access to Sigi Personal Assistant, SigiOS
            Watchlist, and Sigi Portfolio Read.
          </p>

          <div className={["mt-6 grid gap-4", isMobilePreview ? "" : "lg:grid-cols-3"].join(" ")}>
            <FeatureCard
              compact={isMobilePreview}
              icon={<Brain />}
              title="Sigi Personal Assistant"
              text="Ask Sigi market questions, review stocks, understand risk, and receive guided intelligence inside your workflow."
            />

            <FeatureCard
              compact={isMobilePreview}
              icon={<ChartNoAxesCombined />}
              title="SigiOS Watchlist"
              text="Opens Track What Matters, where users monitor selected stocks with live pricing, SigiOS scoring, momentum context, and quick access to charts, portfolio tracking, and workspaces."
            />

            <FeatureCard
              compact={isMobilePreview}
              icon={<Briefcase />}
              title="Sigi Portfolio Read"
              text="Track holdings, monitor conviction, and manage idea buckets inside the same intelligence system."
            />
          </div>
        </section>

        <section className={isMobilePreview ? "rounded-3xl border border-amber-400/30 bg-linear-to-br from-amber-950/30 to-slate-950 p-4" : "rounded-3xl border border-amber-400/30 bg-linear-to-br from-amber-950/30 to-slate-950 p-6 md:p-8"}>
          <div className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-amber-300">
            Pro Intelligence
          </div>

          <h2 className={isMobilePreview ? "text-2xl font-bold leading-tight" : "text-3xl font-bold"}>
            Sigi Pro reserves total access to Sigi Intelligence.
          </h2>

          <p className={isMobilePreview ? "mt-4 max-w-none text-sm leading-6 text-slate-300" : "mt-4 max-w-4xl text-sm leading-7 text-slate-300 md:text-base"}>
            Pro users unlock Sigi Experts and Sigi Screener, giving serious
            investors deeper market discovery, analyst conviction, insider
            signals, and institutional context.
          </p>

          <div className={["mt-6 grid gap-4", isMobilePreview ? "" : "lg:grid-cols-2"].join(" ")}>
            <FeatureCard
              compact={isMobilePreview}
              gold
              icon={<Star />}
              title="Sigi Experts"
              text="Access the Sigi Expert Desk where users can view track-rated analyst calls, insider conviction, and institutional ownership trends."
            />

            <FeatureCard
              compact={isMobilePreview}
              gold
              icon={<Search />}
              title="Sigi Screener"
              text="Search the market with advanced filters, setup logic, sector intelligence, and SigiOS scoring."
            />

            <FeatureCard
              compact={isMobilePreview}
              gold
              icon={<Sparkles />}
              title="Analyst Top Picks Across the Market"
              text="Diversified analyst signals ranked with fresh calls weighted highest, then upside, rating quality, recency, and sector balance."
            />

            <FeatureCard
              compact={isMobilePreview}
              gold
              icon={<ChartNoAxesCombined />}
              title="Sector Tabs"
              text="Use sector tabs to drill into the top analyst-ranked names inside each market group."
            />
          </div>

          <div className={isMobilePreview ? "mt-6" : "mt-8"}>
            <div className="overflow-hidden rounded-4xl border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(6,13,24,0.95),rgba(2,8,18,0.98))] p-3 shadow-[0_0_55px_rgba(34,211,238,0.08)] md:p-4">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.32em] text-cyan-300">
                    Pro Trading Workspace
                  </div>
                  <h3 className={isMobilePreview ? "mt-2 text-xl font-bold text-white" : "mt-2 text-2xl font-bold text-white md:text-3xl"}>
                    See the full trading screen Pro unlocks.
                  </h3>
                  <p className={isMobilePreview ? "mt-2 text-sm leading-6 text-slate-300" : "mt-2 max-w-3xl text-sm leading-7 text-slate-300 md:text-base"}>
                    Live chart structure, levels, indicators, and workspace controls stay visible in one execution-ready terminal.
                  </p>
                </div>

                <div className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-100">
                  Full Workspace View
                </div>
              </div>

              <div className="overflow-hidden rounded-[28px] border border-cyan-400/18 bg-black/40">
                <Image
                  src={tradingWorkspaceScreenshot}
                  alt="Sigi Pro Trading Workspace screenshot showing the full chart, levels, indicators, and control rail"
                  priority
                  sizes="(min-width: 1536px) 1400px, (min-width: 1280px) 1200px, (min-width: 768px) 92vw, 100vw"
                  className="h-auto w-full"
                />
              </div>
            </div>
          </div>
        </section>

        <section className={isMobilePreview ? "rounded-3xl border border-amber-400/20 bg-black/40 p-4" : "rounded-3xl border border-amber-400/20 bg-black/40 p-6 md:p-8"}>
          <div className="flex items-center gap-3">
            <Lock className="text-amber-300" />
            <h2 className={isMobilePreview ? "text-xl font-bold" : "text-2xl font-bold"}>Experts Page Reserved for Pro</h2>
          </div>

          <p className={isMobilePreview ? "mt-3 max-w-none text-sm leading-6 text-slate-300" : "mt-3 max-w-3xl text-sm leading-7 text-slate-300"}>
            Expert market intelligence is reserved for Sigi Pro members. Upgrade
            to unlock analyst-ranked opportunities, institutional ownership
            trends, insider conviction, and advanced market discovery.
          </p>

          <Link
            href={PRO_DASHBOARD_HREF}
            className="mt-6 inline-flex rounded-2xl border border-amber-300/30 bg-amber-400/10 px-5 py-3 text-sm font-bold text-amber-200 transition hover:bg-amber-400/20"
          >
            Open Pro Desk
          </Link>
        </section>

        <section className={isMobilePreview ? "rounded-3xl border border-cyan-400/20 bg-slate-950/90 p-4" : "rounded-3xl border border-cyan-400/20 bg-slate-950/90 p-6 md:p-8"}>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.35em] text-cyan-300">
                Inside The Pro Desk
              </div>
              <h2 className={isMobilePreview ? "mt-2 text-2xl font-bold leading-tight" : "mt-3 text-3xl font-bold"}>
                Preview the Pro experience before you unlock Experts.
              </h2>
              <p className={isMobilePreview ? "mt-3 max-w-none text-sm leading-6 text-slate-300" : "mt-3 max-w-4xl text-sm leading-7 text-slate-300 md:text-base"}>
                These locked previews show the type of analyst command views, model baskets,
                market-wide rankings, and insider conviction panels available inside Sigi Pro.
              </p>
            </div>

            <Link
              href={PRO_DASHBOARD_HREF}
              className="inline-flex rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-3 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/20"
            >
              Unlock The Experts Desk
            </Link>
          </div>

          <div className={["mt-8 grid gap-5", isMobilePreview ? "grid-cols-1" : "xl:grid-cols-2"].join(" ")}>
            {PRO_PREVIEW_CARDS.map((card) => (
              <ProPreviewCard
                key={card.title}
                compact={isMobilePreview}
                title={card.title}
                eyebrow={card.eyebrow}
                description={card.description}
                badge={card.badge}
                tone={card.tone}
                preview={card.preview}
              />
            ))}
          </div>
        </section>
        </div>
      </section>
    </main>
  );
}

type ProPreviewTone = "cyan" | "emerald" | "amber";

type ProPreviewCardConfig = {
  title: string;
  eyebrow: string;
  description: string;
  badge: string;
  tone: ProPreviewTone;
  preview: ReactNode;
};

const PRO_PREVIEW_CARDS: ProPreviewCardConfig[] = [
  {
    title: "Analyst Sector Command",
    eyebrow: "Sigi Analyst Command",
    description:
      "Sector-by-sector analyst leadership with strongest call tracking, covered names, and Sigi reasoning.",
    badge: "Pro",
    tone: "cyan",
    preview: (
      <div className="rounded-[30px] border border-cyan-400/20 bg-[#020817] p-5 shadow-[0_0_50px_rgba(34,211,238,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-emerald-300">
              Sigi Analyst Command
            </div>
            <div className="mt-2 text-3xl font-black text-white">Analysts Picks by Sector</div>
            <div className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
              Sector-ranked analyst leadership, strongest calls, and why Sigi selected the lead.
            </div>
          </div>
          <div className="rounded-full border border-cyan-300/30 bg-cyan-300/12 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
            Ask Sigi
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {[
            "Technology",
            "Healthcare",
            "Financial Services",
            "Industrials",
            "Energy",
          ].map((item, index) => (
            <span
              key={item}
              className={`rounded-full border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] ${index === 0 ? "border-cyan-300/50 bg-cyan-300/12 text-cyan-100" : "border-white/10 bg-white/5 text-slate-400"}`}
            >
              {item}
            </span>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[26px] border border-cyan-400/18 bg-cyan-400/6 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-300">Sigi Pick</div>
                <div className="mt-3 text-3xl font-black text-white">Sigi AI Leader</div>
                <div className="mt-1 text-sm text-slate-400">SigiOS Analyst Flow · Technology</div>
              </div>
              <div className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100">
                Pro
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <PreviewStat label="Success Rate" value="78%" />
              <PreviewStat label="Avg Return" value="+26.7%" />
              <div className="sm:col-span-2">
                <PreviewStat label="Strongest Call" value="NVDA" />
              </div>
            </div>
            <PreviewBox className="mt-4" label="Most Recent Visible Pick" value="NVDA · Buy (+17.4%)" />
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                "NVDA",
                "MSFT",
                "AAPL",
                "AVGO",
              ].map((ticker) => (
                <span key={ticker} className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">
                  {ticker}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/4 p-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300">Why Sigi Selected This</div>
            <div className="mt-4 text-sm leading-7 text-slate-300">
              Technology calls show strong AI infrastructure alignment, high conviction,
              and consistent upside capture across the dominant mega-cap names.
            </div>
            <div className="mt-6 rounded-2xl border border-orange-300/20 bg-orange-300/6 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-200">Risk Note</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                Leadership can crowd quickly. Watch earnings reaction, valuation stretch,
                and rate pressure against the next rotation.
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Model Basket Command",
    eyebrow: "Sigi Model Command",
    description:
      "Cross-checked Pro baskets ranked by hit rate, return quality, alignment, and live theme leadership.",
    badge: "Ranked",
    tone: "emerald",
    preview: (
      <div className="rounded-[30px] border border-emerald-400/20 bg-[linear-gradient(180deg,#03291d_0%,#041510_100%)] p-5 shadow-[0_0_50px_rgba(16,185,129,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-emerald-300">Sigi Model Command</div>
            <div className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/70">
              Proprietary baskets cross-checked against live analyst flow, hit-rate consistency, and sector leadership.
            </div>
          </div>
          <div className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100">
            Ranked
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <PreviewMetricCard tone="emerald" label="Avg 30D Hit" value="78%" text="Across model baskets" />
          <PreviewMetricCard tone="emerald" label="Avg 90D Return" value="+21.7%" text="Basket-level forward bias" />
          <PreviewMetricCard tone="emerald" label="Bullish Alignment" value="4/4" text="Models favoring upside flow" />
        </div>
        <div className="mt-5 space-y-4">
          {[
            ["Technology Growth Desk", "Technology leaders", "78%", "+21.2%", ["NVDA", "AAPL", "MSFT"]],
            ["Large Cap AI Basket", "AI / software", "78%", "+20.4%", ["NVDA", "GOOGL", "NFLX"]],
            ["Institutional Conviction Basket", "Mega-cap tech", "78%", "+20.4%", ["NVDA", "GOOGL", "NFLX"]],
          ].map(([name, style, hit, avg, tickers]) => (
            <div key={String(name)} className="rounded-[26px] border border-emerald-400/12 bg-black/18 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-black text-white">{name}</div>
                    <span className="rounded-full border border-emerald-400/25 bg-emerald-400/12 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100">
                      Bullish
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/35">{style}</div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <PreviewStat label="Style" value={String(style)} subdued />
                    <PreviewStat label="30D Hit" value={String(hit)} subdued />
                    <PreviewStat label="Avg 90D" value={String(avg)} subdued />
                  </div>
                </div>
                <div className="w-full max-w-sm rounded-3xl border border-emerald-400/12 bg-black/16 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Basket Names</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(tickers as string[]).map((ticker) => (
                      <span key={ticker} className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-bold text-cyan-100">{ticker}</span>
                    ))}
                  </div>
                  <div className="mt-4 h-1.5 rounded-full bg-white/10">
                    <div className="h-full w-3/4 rounded-full bg-[linear-gradient(90deg,rgba(16,185,129,1),rgba(103,232,249,0.9))]" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Market-Wide Analyst Rankings",
    eyebrow: "Analyst Top Picks Across The Market",
    description:
      "Fresh calls weighted highest with upside, rating quality, recency, and sector balance layered into the ranking model.",
    badge: "Live",
    tone: "cyan",
    preview: (
      <div className="rounded-[30px] border border-cyan-400/18 bg-black p-5 shadow-[0_0_45px_rgba(6,182,212,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-amber-300">Analyst Top Picks Across The Market</div>
            <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Diversified analyst signals ranked with fresh calls weighted highest, then upside, rating quality, recency, and sector balance.
            </div>
          </div>
          <div className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100">
            Live
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {[
            "All",
            "Technology",
            "Healthcare",
            "Financial Services",
            "Industrials",
          ].map((item, index) => (
            <span key={item} className={`rounded-full border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] ${index === 0 ? "border-cyan-300/45 bg-cyan-300/10 text-cyan-100" : "border-white/10 bg-white/5 text-slate-400"}`}>
              {item}
            </span>
          ))}
        </div>
        <PreviewBox className="mt-5" label="Showing diversified top picks from a broader 30-name consensus pool." value="12 ranked picks" inverse />
        <div className="mt-5 space-y-4">
          {[
            ["NVDA", "NVIDIA Corporation", "$223.33", "+25.2%", "$279.5", "$140", "191", "Buy from HSBC. Low confidence setup in Technology."],
            ["GE", "GE Aerospace", "$300.17", "+26.9%", "$381", "$355", "191", "Outperform from RBC Capital. High confidence setup in Industrials."],
          ].map(([ticker, name, price, change, target, low, score, summary]) => (
            <div key={String(ticker)} className="rounded-[28px] border border-emerald-400/20 bg-emerald-950/18 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-4xl font-black text-white">{ticker}</div>
                    <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100">
                      Bullish
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-slate-400">{name}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300">
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/8 px-2 py-1 text-cyan-100">Fresh</span>
                    <span>Buy</span>
                    <span>Technology</span>
                    <span>2026-05-19</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-white">{price}</div>
                  <div className="mt-2 text-xl font-bold text-emerald-300">{change}</div>
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <PreviewStat label="Target" value={String(target)} />
                <PreviewStat label="Low" value={String(low)} />
                <PreviewStat label="Score" value={String(score)} />
              </div>
              <div className="mt-4 text-sm leading-7 text-slate-200">{summary}</div>
              <div className="mt-5 h-2 rounded-full bg-white/10">
                <div className="h-full w-3/5 rounded-full bg-[linear-gradient(90deg,rgba(16,185,129,1),rgba(103,232,249,0.9))]" />
              </div>
              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="rounded-2xl border border-emerald-400/20 bg-black/25 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-100">Open Chart</span>
                <span className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white/60">Open Workspace</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Insider Conviction View",
    eyebrow: "Insider Trading",
    description:
      "Recent insider purchases ranked into a tighter conviction read with buyer identity, dollar size, and filing context.",
    badge: "Live Filings",
    tone: "amber",
    preview: (
      <div className="rounded-[30px] border border-amber-400/18 bg-black p-5 shadow-[0_0_45px_rgba(251,191,36,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-amber-300">Insider Trading</div>
            <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              The 5 most recent reported insider stock purchases, with SIGI highlighting the strongest disclosed buy in the current window.
            </div>
          </div>
          <div className="rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100">
            Live Filings
          </div>
        </div>
        <div className="mt-5 rounded-3xl border border-cyan-400/18 bg-cyan-400/8 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-100">Sigi Summary</div>
          <div className="mt-2 text-sm leading-7 text-slate-200">
            Sigi is showing the 5 most recent insider purchases first and highlighting the largest visible dollar commitment across the latest filings.
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <PreviewMetricCard tone="cyan" label="Cluster Buying" value="2 recent buys" text="Filed in HRTG" />
          <PreviewMetricCard tone="emerald" label="Repeat Buyer" value="Whiting Paul L" text="Appears twice in window" />
        </div>
        <div className="mt-5 space-y-4">
          {[
            ["Heritage Insurance Holdings, Inc.", "HRTG", "$352,500", "15,000", "May 18, 2026", "WHITING PAUL L · director"],
            ["Latham Group, Inc.", "SWIM", "$242,000", "50,000", "May 18, 2026", "Cline James E · director"],
          ].map(([name, ticker, purchased, shares, tradeDate, buyer]) => (
            <div key={String(ticker)} className="rounded-[28px] border border-white/10 bg-white/3 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-3xl font-black text-white">{name}</div>
                  <div className="mt-2 text-lg font-black text-cyan-300">{ticker}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-100">Financial Services</span>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100">Director</span>
                  </div>
                </div>
                <div className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-black text-emerald-100">
                  {purchased}
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <PreviewStat label="Purchased" value={String(purchased)} />
                <PreviewStat label="Shares" value={String(shares)} />
                <PreviewStat label="Trade Date" value={String(tradeDate)} />
                <PreviewStat label="Buyer" value={String(buyer)} />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 text-xs font-semibold text-slate-400">
                <span>P-Purchase</span>
                <span>Analyze with SIGI →</span>
                <span>SEC filing ↗</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

function FeatureCard({
  icon,
  title,
  text,
  gold = false,
  compact = false,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  gold?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border ${compact ? "p-4" : "p-5"} ${
        gold
          ? "border-amber-400/20 bg-amber-400/5"
          : "border-cyan-400/15 bg-cyan-400/5"
      }`}
    >
      <div className={gold ? "text-amber-300" : "text-cyan-300"}>{icon}</div>
      <h3 className={compact ? "mt-3 text-base font-bold" : "mt-4 text-lg font-bold"}>{title}</h3>
      <p className={compact ? "mt-2 text-sm leading-6 text-slate-300" : "mt-3 text-sm leading-6 text-slate-300"}>{text}</p>
    </div>
  );
}

function ProPreviewCard({
  title,
  eyebrow,
  description,
  badge,
  tone,
  preview,
  compact = false,
}: ProPreviewCardConfig & { compact?: boolean }) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-400/25 bg-emerald-400/6 text-emerald-200"
      : tone === "amber"
        ? "border-amber-400/25 bg-amber-400/6 text-amber-200"
        : "border-cyan-400/25 bg-cyan-400/6 text-cyan-200";

  return (
    <div className="overflow-hidden rounded-[30px] border border-white/10 bg-black/35">
      <div className={compact ? "p-4" : "p-5 md:p-6"}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">
              {eyebrow}
            </div>
            <h3 className="mt-2 text-xl font-black text-white md:text-2xl">{title}</h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{description}</p>
          </div>
          <div className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${toneClass}`}>
            {badge}
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/8 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_45%)] p-3 md:p-4">
        <div className="pointer-events-none select-none overflow-hidden rounded-[26px] opacity-95">
          <div className="h-105 overflow-hidden md:h-125 xl:h-135">
            <div className="origin-top-left scale-[0.56] sm:scale-[0.64] lg:scale-[0.74] xl:scale-[0.68]">
              <div className="w-180 *:w-full">
                {preview}
              </div>
            </div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-[#020817] via-[#020817]/82 to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,8,23,0.02),rgba(2,8,23,0.22))]" />
        <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between gap-3 rounded-2xl border border-amber-300/20 bg-black/72 px-4 py-3 backdrop-blur">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-300">Pro Access</div>
            <div className="mt-1 text-sm font-semibold text-white">Unlock the full Experts desk to open this view.</div>
          </div>
          <Link
            href={PRO_DASHBOARD_HREF}
            className="shrink-0 rounded-xl border border-amber-300/30 bg-amber-400/12 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-amber-100 transition hover:bg-amber-400/18"
          >
            Open Pro
          </Link>
        </div>
      </div>
    </div>
  );
}

function PreviewStat({
  label,
  value,
  subdued = false,
}: {
  label: string;
  value: string;
  subdued?: boolean;
}) {
  return (
    <div className={`min-w-0 rounded-2xl border p-4 ${subdued ? "border-white/10 bg-black/20" : "border-white/10 bg-black/25"}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className="mt-2 wrap-break-word text-base font-black leading-tight text-white sm:text-lg">{value}</div>
    </div>
  );
}

function PreviewBox({
  label,
  value,
  className = "",
  inverse = false,
}: {
  label: string;
  value: string;
  className?: string;
  inverse?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${inverse ? "border-white/10 bg-white/3" : "border-white/10 bg-black/25"} ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">{label}</div>
        {inverse ? <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{value}</div> : null}
      </div>
      {!inverse ? <div className="mt-2 text-sm font-semibold text-white">{value}</div> : null}
    </div>
  );
}

function PreviewMetricCard({
  tone,
  label,
  value,
  text,
}: {
  tone: ProPreviewTone;
  label: string;
  value: string;
  text: string;
}) {
  const toneClasses =
    tone === "emerald"
      ? "border-emerald-400/20 bg-emerald-400/8"
      : tone === "amber"
        ? "border-amber-300/20 bg-amber-300/8"
        : "border-cyan-400/20 bg-cyan-400/8";

  const valueClasses =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "amber"
        ? "text-amber-200"
        : "text-cyan-300";

  return (
    <div className={`rounded-[22px] border p-4 ${toneClasses}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">{label}</div>
      <div className={`mt-3 text-4xl font-black ${valueClasses}`}>{value}</div>
      <div className="mt-2 text-xs text-white/45">{text}</div>
    </div>
  );
}

function PlanCard({
  badge,
  title,
  price,
  subtitle,
  features,
  cta,
  href,
  highlighted = false,
  premium = false,
  compact = false,
}: {
  badge: string;
  title: string;
  price: string;
  subtitle: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
  premium?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border ${compact ? "p-4" : "p-6"} ${
        premium
          ? "border-amber-400/30 bg-amber-950/20"
          : highlighted
            ? "border-cyan-400/40 bg-cyan-950/30"
            : "border-slate-700 bg-slate-950/70"
      }`}
    >
      <div
        className={`text-xs font-bold uppercase tracking-[0.3em] ${
          premium ? "text-amber-300" : "text-cyan-300"
        }`}
      >
        {badge}
      </div>

      <h3 className={compact ? "mt-3 text-xl font-bold" : "mt-4 text-2xl font-bold"}>{title}</h3>

      <div className="mt-3 flex items-end gap-1">
        <span className={compact ? "text-3xl font-black" : "text-4xl font-black"}>{price}</span>
        {price !== "$0" ? <span className="mb-1 text-sm text-slate-400">/mo</span> : null}
      </div>

      <p className="mt-3 text-sm text-slate-300">{subtitle}</p>

      <div className="mt-6 space-y-3">
        {features.map((feature) => (
          <div key={feature} className="rounded-xl border border-white/10 bg-white/3 px-3 py-2 text-sm text-slate-200">
            {feature}
          </div>
        ))}
      </div>

      <Link
        href={href}
        className={`mt-6 inline-flex w-full justify-center rounded-2xl px-4 py-3 text-sm font-bold transition ${
          premium
            ? "border border-amber-300/30 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20"
            : "border border-cyan-300/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}
