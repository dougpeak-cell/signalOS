"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { getSigiAnnualSavingsPercent, getSigiPriceAmount, type BillingInterval } from "@/lib/billing/pricing";

export default function LandingPricingCards() {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const smartPrice = getSigiPriceAmount("smart", billingInterval);
  const smartSavings = getSigiAnnualSavingsPercent("smart");
  const proPrice = getSigiPriceAmount("pro", billingInterval);
  const proSavings = getSigiAnnualSavingsPercent("pro");
  const suffix = billingInterval === "annual" ? "/yr" : "/mo";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
      <div className="flex items-center justify-center sm:col-span-2 lg:col-span-1">
        <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/25 p-1">
          <button
            type="button"
            onClick={() => setBillingInterval("monthly")}
            className={[
              "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition",
              billingInterval === "monthly" ? "bg-teal-300/16 text-teal-100" : "text-white/56 hover:text-white/78",
            ].join(" ")}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingInterval("annual")}
            className={[
              "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition",
              billingInterval === "annual" ? "bg-teal-300/16 text-teal-100" : "text-white/56 hover:text-white/78",
            ].join(" ")}
          >
            Annual
            <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-emerald-200">
              Save up to {Math.max(smartSavings, proSavings)}%
            </span>
          </button>
        </div>
      </div>

      <Pricing
        name="Smart"
        amount={`$${smartPrice.toFixed(2)}`}
        priceSuffix={suffix}
        savingsLabel={billingInterval === "annual" ? `Save ${smartSavings}%` : undefined}
        headline="Preview Access"
        badge="Most Popular"
        href={`/auth/upgrade?plan=smart&interval=${billingInterval}`}
        items={[
          "Ask Sigi market questions",
          "Open Watchlist and Portfolio",
          "Track ideas with live context",
        ]}
      />
      <Pricing
        name="Pro"
        amount={`$${proPrice.toFixed(2)}`}
        priceSuffix={suffix}
        savingsLabel={billingInterval === "annual" ? `Save ${proSavings}%` : undefined}
        headline="Full Intelligence"
        badge="Full Access"
        href={`/auth/upgrade?plan=pro&interval=${billingInterval}`}
        items={[
          "Experts and Screener access",
          "Trading workspace workflows",
          "Deeper intelligence surfaces",
        ]}
      />
      <div className="rounded-[1.75rem] border border-white/12 bg-[#08131b] p-3 shadow-[0_14px_40px_rgba(0,0,0,0.18)] sm:col-span-2 lg:col-span-1">
        <div className="overflow-hidden rounded-[1.35rem] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.10),transparent_52%),#07131d]">
          <Image
            src="/landing/mission.png"
            alt="SigiOS founder mission visual"
            width={1200}
            height={900}
            className="h-auto w-full object-contain object-center"
          />
        </div>
      </div>
    </div>
  );
}

function Pricing({
  name,
  amount,
  priceSuffix,
  savingsLabel,
  headline,
  badge,
  href,
  items,
}: {
  name: string;
  amount: string;
  priceSuffix?: string;
  savingsLabel?: string;
  headline: string;
  badge: string;
  href: string;
  items: string[];
}) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-[#08131b] p-6 text-white shadow-[0_14px_40px_rgba(0,0,0,0.18)] sm:p-7">
      <div className="inline-flex rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-100">
        {badge}
      </div>
      <div className="mt-3 text-sm font-semibold uppercase tracking-[0.22em] text-teal-200/78 sm:text-base">
        {name}
      </div>

      <div className="mt-3 flex items-end gap-1.5 text-white">
        <div className="text-4xl font-black leading-none sm:text-5xl">{amount}</div>
        {priceSuffix ? (
          <div className="pb-1 text-sm font-semibold text-white/55 sm:text-base">
            {priceSuffix}
          </div>
        ) : null}
        {savingsLabel ? (
          <div className="mb-1 ml-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
            {savingsLabel}
          </div>
        ) : null}
      </div>

      <div className="mt-3 text-2xl font-black leading-tight text-white sm:text-[2rem]">
        {headline}
      </div>

      <div className="mt-5 space-y-3 text-base leading-8 text-white/82 sm:text-lg">
        {items.map((item) => (
          <div key={item}>✓ {item}</div>
        ))}
      </div>

      <Link
        href={href}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/12 px-4 text-base font-semibold text-white/92 transition hover:border-teal-300/35 hover:bg-teal-300/10 hover:text-white"
      >
        Choose {name}
      </Link>
    </div>
  );
}
