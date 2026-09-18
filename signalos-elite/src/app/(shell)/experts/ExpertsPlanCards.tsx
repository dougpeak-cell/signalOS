"use client";

import Link from "next/link";
import { useState } from "react";
import { getSigiAnnualSavingsPercent, getSigiPriceAmount, type BillingInterval } from "@/lib/billing/pricing";

const SMART_PREVIEW_HREF = "/experts/smart";
const PRO_DASHBOARD_HREF = "/experts/pro";

export default function ExpertsPlanCards({ compact = false }: { compact?: boolean }) {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const proPrice = getSigiPriceAmount("pro", billingInterval);
  const proSavings = getSigiAnnualSavingsPercent("pro");

  return (
    <>
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/25 p-1">
          <button
            type="button"
            onClick={() => setBillingInterval("monthly")}
            className={[
              "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition",
              billingInterval === "monthly" ? "bg-cyan-400/14 text-cyan-100" : "text-white/56 hover:text-white/78",
            ].join(" ")}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingInterval("annual")}
            className={[
              "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition",
              billingInterval === "annual" ? "bg-cyan-400/14 text-cyan-100" : "text-white/56 hover:text-white/78",
            ].join(" ")}
          >
            Annual
            <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-emerald-200">
              Save {proSavings}%
            </span>
          </button>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-white/50">Annual pricing applies to Sigi Pro.</p>

      <section className={["mt-6 grid gap-6", compact ? "" : "lg:grid-cols-3"].join(" ")}>
        <PlanCard
          compact={compact}
          badge="Current Access"
          title="Sigi"
          price="$0"
          priceSuffix=""
          subtitle="Quick View market access"
          features={["Quick View Watchlist", "Quick View Portfolio", "Basic market navigation"]}
          cta="Current Plan"
          href="/today"
        />

        <PlanCard
          compact={compact}
          highlighted
          badge="Smart Users"
          title="Sigi Smart"
          price="$9.00"
          priceSuffix="/mo"
          subtitle="Personal assistant + portfolio intelligence"
          features={[
            "Sigi Personal Assistant",
            "SigiOS Watchlist intelligence",
            "Sigi Portfolio Read",
            "SigiOS Vision and SigiOS Workspace",
            "Sigi Pulse, powered by AMSA",
            "Live pricing and SigiOS scoring",
            "Momentum context and chart access",
          ]}
          cta="Upgrade to Smart"
          href={SMART_PREVIEW_HREF}
        />

        <PlanCard
          compact={compact}
          premium
          badge="Pro Users"
          title="Sigi Pro"
          price={`$${proPrice.toFixed(2)}`}
          priceSuffix={billingInterval === "annual" ? "/yr" : "/mo"}
          savingsLabel={billingInterval === "annual" ? `Save ${proSavings}%` : undefined}
          subtitle="Total access to Sigi Intelligence"
          features={[
            "Everything in Smart",
            "SigiOS Vision and SigiOS Workspace",
            "Sigi Pulse, powered by AMSA",
            "Sigi Experts",
            "Sigi Screener",
            "Full everyday Crypto access",
            "Analyst Top Picks Across the Market",
            "Institutional ownership trends",
          ]}
          cta="Reserve Pro Access"
          href={PRO_DASHBOARD_HREF}
        />
      </section>
    </>
  );
}

function PlanCard({
  badge,
  title,
  price,
  priceSuffix = "/mo",
  savingsLabel,
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
  priceSuffix?: string;
  savingsLabel?: string;
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
        {priceSuffix ? <span className="mb-1 text-sm text-slate-400">{priceSuffix}</span> : null}
        {savingsLabel ? (
          <span className="mb-1 ml-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
            {savingsLabel}
          </span>
        ) : null}
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
