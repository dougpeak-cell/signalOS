import Link from "next/link";
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

const PRO_DASHBOARD_HREF = "/experts/pro";

export default function ExpertsPage() {
  return (
    <main className="min-h-screen bg-[#020817] px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-3xl border border-cyan-400/20 bg-cyan-950/20 p-6 shadow-[0_0_40px_rgba(34,211,238,0.08)] md:p-8">
          <div className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-cyan-300">
            SignalOS Access
          </div>

          <h1 className="text-3xl font-bold md:text-5xl">
            Choose the intelligence level that fits your market workflow.
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
            Current users get Quick View access to Watchlist and Portfolio.
            Smart unlocks Sigi Personal Assistant, Watchlist intelligence, and
            Portfolio Read. Pro unlocks total Sigi Intelligence, including
            Experts and Screener.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-700/70 bg-slate-950/70 p-6">
          <div className="flex items-center gap-3">
            <Eye className="text-cyan-300" />
            <h2 className="text-2xl font-bold">Current Users</h2>
          </div>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            Current users have Quick View access to SignalOS Watchlist and Sigi
            Portfolio so they can preview the market workflow before upgrading.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <FeatureCard
              icon={<TrendingUp />}
              title="Quick View Watchlist"
              text="Preview selected stocks and market movement inside the SignalOS experience."
            />
            <FeatureCard
              icon={<Briefcase />}
              title="Quick View Portfolio"
              text="Preview portfolio structure and idea tracking before unlocking deeper intelligence."
            />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <PlanCard
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
            highlighted
            badge="Smart Users"
            title="Sigi Smart"
            price="$9.00"
            subtitle="Personal assistant + portfolio intelligence"
            features={[
              "Sigi Personal Assistant",
              "SignalOS Watchlist intelligence",
              "Sigi Portfolio Read",
              "Live pricing and SigiOS scoring",
              "Momentum context and chart access",
            ]}
            cta="Upgrade to Smart"
            href="/settings/sigi"
          />

          <PlanCard
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

        <section className="rounded-3xl border border-cyan-400/20 bg-slate-950/80 p-6 md:p-8">
          <div className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-cyan-300">
            Smart Access
          </div>

          <h2 className="text-3xl font-bold">Sigi Smart unlocks your personal investing assistant.</h2>

          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300 md:text-base">
            Smart users have access to Sigi Personal Assistant, SignalOS
            Watchlist, and Sigi Portfolio Read.
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <FeatureCard
              icon={<Brain />}
              title="Sigi Personal Assistant"
              text="Ask Sigi market questions, review stocks, understand risk, and receive guided intelligence inside your workflow."
            />

            <FeatureCard
              icon={<ChartNoAxesCombined />}
              title="SignalOS Watchlist"
              text="Opens Track What Matters, where users monitor selected stocks with live pricing, SigiOS scoring, momentum context, and quick access to charts, portfolio tracking, and workspaces."
            />

            <FeatureCard
              icon={<Briefcase />}
              title="Sigi Portfolio Read"
              text="Track holdings, monitor conviction, and manage idea buckets inside the same intelligence system."
            />
          </div>
        </section>

        <section className="rounded-3xl border border-amber-400/30 bg-linear-to-br from-amber-950/30 to-slate-950 p-6 md:p-8">
          <div className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-amber-300">
            Pro Intelligence
          </div>

          <h2 className="text-3xl font-bold">
            Sigi Pro reserves total access to Sigi Intelligence.
          </h2>

          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300 md:text-base">
            Pro users unlock Sigi Experts and Sigi Screener, giving serious
            investors deeper market discovery, analyst conviction, insider
            signals, and institutional context.
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <FeatureCard
              gold
              icon={<Star />}
              title="Sigi Experts"
              text="Access the Sigi Expert Desk where users can view track-rated analyst calls, insider conviction, and institutional ownership trends."
            />

            <FeatureCard
              gold
              icon={<Search />}
              title="Sigi Screener"
              text="Search the market with advanced filters, setup logic, sector intelligence, and SigiOS scoring."
            />

            <FeatureCard
              gold
              icon={<Sparkles />}
              title="Analyst Top Picks Across the Market"
              text="Diversified analyst signals ranked with fresh calls weighted highest, then upside, rating quality, recency, and sector balance."
            />

            <FeatureCard
              gold
              icon={<ChartNoAxesCombined />}
              title="Sector Tabs"
              text="Use sector tabs to drill into the top analyst-ranked names inside each market group."
            />
          </div>
        </section>

        <section className="rounded-3xl border border-amber-400/20 bg-black/40 p-6 md:p-8">
          <div className="flex items-center gap-3">
            <Lock className="text-amber-300" />
            <h2 className="text-2xl font-bold">Experts Page Reserved for Pro</h2>
          </div>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
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
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  text,
  gold = false,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  gold?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        gold
          ? "border-amber-400/20 bg-amber-400/5"
          : "border-cyan-400/15 bg-cyan-400/5"
      }`}
    >
      <div className={gold ? "text-amber-300" : "text-cyan-300"}>{icon}</div>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-300">{text}</p>
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
}) {
  return (
    <div
      className={`rounded-3xl border p-6 ${
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

      <h3 className="mt-4 text-2xl font-bold">{title}</h3>

      <div className="mt-3 flex items-end gap-1">
        <span className="text-4xl font-black">{price}</span>
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
