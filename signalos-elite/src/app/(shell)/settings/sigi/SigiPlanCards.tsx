"use client";

import Link from "next/link";
import { useState } from "react";
import { scheduleStripeDowngrade, startStripeUpgradeCheckout } from "@/lib/billing/client";
import { SIGI_PRICING } from "@/lib/billing/pricing";
import type { SigiTier } from "@/lib/sigi/gates";
import { getSigiTierCard } from "@/lib/sigi/plans";
import type { SigiTierCard } from "@/lib/sigi/plans";

type Props = {
  cards: SigiTierCard[];
  currentTier: SigiTier;
  pendingTier: SigiTier | null;
  pendingTierEffectiveLabel: string | null;
};

export default function SigiPlanCards({ cards, currentTier, pendingTier, pendingTierEffectiveLabel }: Props) {
  const [pendingPlan, setPendingPlan] = useState<"smart" | "pro" | "downgrade-smart" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function getIdentityCta(plan: "smart" | "pro"): string {
    return plan === "smart" ? "Become a Smart user" : "Become a Pro user";
  }

  async function startUpgrade(plan: "smart" | "pro") {
    setPendingPlan(plan);
    setError(null);

    try {
      await startStripeUpgradeCheckout(plan);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start checkout");
      setPendingPlan(null);
    }
  }

  async function startDowngrade(plan: "smart") {
    setPendingPlan(`downgrade-${plan}`);
    setError(null);

    try {
      await scheduleStripeDowngrade(plan);
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to schedule downgrade");
      setPendingPlan(null);
    }
  }

  return (
    <>
      {error ? (
        <div className="rounded-3xl border border-rose-400/18 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <section id="plans" className="grid gap-4 lg:grid-cols-3">
        {cards.map((card) => {
          const isCurrent = currentTier === card.tier;
          const isRecommended = card.tier === "smart";
          const isElite = card.tier === "pro";
          const isPaidTier = card.tier === "smart" || card.tier === "pro";
          const paidTier: "smart" | "pro" | null =
            card.tier === "smart" ? "smart" : card.tier === "pro" ? "pro" : null;
          const pricing = paidTier ? SIGI_PRICING[paidTier] : null;
          const microCopy =
            card.tier === "smart"
              ? "Most users start here"
              : card.tier === "pro"
                ? "For serious operators"
                : null;
          const urgencyCopy =
            card.tier === "smart"
              ? "Upgrade now to unlock this instantly"
              : card.tier === "pro"
                ? "Available immediately with Sigi Pro"
                : null;
          const socialProofCopy =
            card.tier === "smart"
              ? "Most active users upgrade to Smart"
              : card.tier === "pro"
                ? "Power users rely on Pro"
                : null;
          const paidTierIdentityCta = paidTier ? getIdentityCta(paidTier) : null;
          const isBusy = pendingPlan === card.tier;
          const isScheduledDowngradeTarget = currentTier === "pro" && card.tier === "smart";
          const hasScheduledDowngrade = pendingTier === "smart";

          return (
            <article
              key={card.tier}
              id={card.tier}
              className={[
                "relative overflow-hidden rounded-[30px] border p-5",
                isCurrent
                  ? "border-cyan-300/26 bg-[linear-gradient(180deg,rgba(10,17,29,0.99),rgba(6,10,19,0.99))] shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_18px_44px_rgba(0,0,0,0.26)]"
                  : isElite
                    ? "border-amber-200/18 bg-[linear-gradient(180deg,rgba(14,11,19,0.99),rgba(8,7,13,0.99))] shadow-[0_0_0_1px_rgba(250,204,21,0.06),0_20px_48px_rgba(0,0,0,0.28)]"
                    : "border-white/10 bg-[linear-gradient(180deg,rgba(9,14,24,0.98),rgba(5,9,17,0.98))]",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
                  {card.eyebrow}
                </div>
                <div className="flex gap-2">
                  {card.badge ? (
                    <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                      {card.badge}
                    </div>
                  ) : null}
                  {isCurrent ? (
                    <div className="rounded-full border border-cyan-400/16 bg-cyan-400/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100/90">
                      Current
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 text-3xl font-semibold tracking-tight text-white">{card.name}</div>
              {pricing ? (
                <div className="mt-2 text-2xl font-bold text-white">
                  ${pricing.priceMonthly}
                  <span className="ml-1 text-sm font-medium text-white/60">/mo</span>
                </div>
              ) : null}
              {urgencyCopy ? <div className="mt-2 text-xs font-medium text-cyan-100/78">{urgencyCopy}</div> : null}
              <div className="mt-2 text-sm text-white/58">{card.tagline}</div>
              {microCopy ? <div className="mt-2 text-xs text-white/60">{microCopy}</div> : null}
              {socialProofCopy ? <div className="mt-1 text-xs text-white/52">{socialProofCopy}</div> : null}
              <p className="mt-4 text-sm leading-6 text-white/74">{card.emotionalTakeaway}</p>

              <div className="mt-5 grid gap-2">
                {card.bullets.map((bullet) => (
                  <div
                    key={bullet}
                    className="rounded-2xl border border-white/8 bg-black/16 px-3 py-2 text-sm text-white/72"
                  >
                    {bullet}
                  </div>
                ))}
              </div>

              <div className="mt-5">
                {isCurrent ? (
                  <span className="inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/78">
                    Current plan
                  </span>
                ) : isScheduledDowngradeTarget ? (
                  hasScheduledDowngrade ? (
                    <div>
                      <span className="inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/78">
                        Downgrades to {getSigiTierCard("smart").name}
                      </span>
                      {pendingTierEffectiveLabel ? (
                        <div className="mt-2 text-xs text-white/52">Scheduled for {pendingTierEffectiveLabel}</div>
                      ) : null}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void startDowngrade("smart")}
                      disabled={pendingPlan !== null}
                      className="inline-flex w-full justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white/82 transition hover:border-white/18 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {pendingPlan === "downgrade-smart" ? "Scheduling downgrade" : "Downgrade to Smart next cycle"}
                    </button>
                  )
                ) : isPaidTier && paidTier === "smart" ? (
                  <a
                    href="/auth/upgrade?plan=smart"
                    className="inline-flex w-full justify-center rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-400/20"
                  >
                    {paidTierIdentityCta}
                  </a>
                ) : isPaidTier ? (
                  <button
                    type="button"
                    onClick={() => paidTier && void startUpgrade(paidTier)}
                    disabled={pendingPlan !== null}
                    className={[
                      "inline-flex rounded-2xl px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
                      isRecommended
                        ? "border border-cyan-400/18 bg-cyan-400/8 text-cyan-100 hover:border-cyan-300/28 hover:bg-cyan-400/12"
                        : "border border-amber-200/18 bg-amber-200/8 text-amber-50 hover:border-amber-100/30 hover:bg-amber-200/12",
                    ].join(" ")}
                  >
                    {isBusy ? "Starting checkout" : paidTierIdentityCta}
                  </button>
                ) : (
                  <Link
                    href="/"
                    className="inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/78 transition hover:border-white/18 hover:bg-white/8"
                  >
                    {card.cta}
                  </Link>
                )}
                {isPaidTier ? (
                  <div className="mt-2 text-xs text-white/52">Cancel anytime. No commitment.</div>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}