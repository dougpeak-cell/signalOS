"use client";

import { useState } from "react";
import { scheduleStripeDowngrade, startStripeUpgradeCheckout } from "@/lib/billing/client";
import { SIGI_PRICING } from "@/lib/billing/pricing";
import type { SigiUserSettingsView } from "@/lib/sigi/settings";
import { getSigiTierCard } from "@/lib/sigi/plans";

type Props = {
  settings: SigiUserSettingsView;
};

export default function SigiBillingStateCard({ settings }: Props) {
  const [busyAction, setBusyAction] = useState<"smart" | "pro" | "portal" | "downgrade-smart" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const planName = getSigiTierCard(settings.currentTier).name;
  const paidPlan =
    settings.currentTier === "smart" || settings.currentTier === "pro"
      ? SIGI_PRICING[settings.currentTier]
      : null;

  async function startUpgrade(plan: "smart" | "pro") {
    setBusyAction(plan);
    setError(null);

    try {
      await startStripeUpgradeCheckout(plan);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start checkout");
      setBusyAction(null);
    }
  }

  async function openBillingPortal() {
    setBusyAction("portal");
    setError(null);

    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { error?: string; url?: string };

      if (!res.ok) {
        throw new Error(data.error || "Unable to open billing portal");
      }

      if (!data.url) {
        throw new Error("Unable to open billing portal");
      }

      window.location.href = data.url;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to open billing portal");
      setBusyAction(null);
    }
  }

  async function startDowngrade(plan: "smart") {
    setBusyAction(`downgrade-${plan}`);
    setError(null);

    try {
      await scheduleStripeDowngrade(plan);
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to schedule downgrade");
      setBusyAction(null);
    }
  }

  let statusLabel: string = settings.billingStatusLabel;
  let detailLabel: string | null = null;
  const upgradeTarget: "smart" | "pro" | null =
    settings.currentTier === "free" ? "smart" : settings.currentTier === "smart" ? "pro" : null;
  const urgencyLabel =
    upgradeTarget === "smart"
      ? "Upgrade now to unlock this instantly"
      : upgradeTarget === "pro"
        ? "Available immediately with Sigi Pro"
        : null;
  const socialProofLabel =
    upgradeTarget === "smart"
      ? "Most active users upgrade to Smart"
      : upgradeTarget === "pro"
        ? "Power users rely on Pro"
        : null;
  const upsellLabel =
    upgradeTarget === "smart"
      ? "Unlock memory and smarter guidance with Sigi Smart."
      : upgradeTarget === "pro"
        ? "Upgrade to Pro Intelligence for deeper insights and proactive Sigi."
        : null;
  const primaryUpgradeLabel =
    upgradeTarget === "smart"
      ? "Become a Smart user"
      : upgradeTarget === "pro"
        ? "Become a Pro user"
        : null;

  if (settings.billingStatus === "payment_issue") {
    statusLabel = settings.billingStatusLabel;
  } else if (settings.billingStatus === "canceling" && settings.billingPeriodEndLabel) {
    statusLabel = `Ends ${settings.billingPeriodEndLabel}`;
  } else if (settings.pendingTier && settings.pendingTierEffectiveLabel) {
    statusLabel = `Downgrades to ${getSigiTierCard(settings.pendingTier).name} ${settings.pendingTierEffectiveLabel}`;
  } else if (settings.billingPeriodEndLabel && settings.currentTier !== "free") {
    detailLabel = `Next billing: ${settings.billingPeriodEndLabel}`;
  }

  const showManageBilling = settings.currentTier !== "free";
  const showUpgradeToPro = settings.currentTier === "smart" && settings.billingStatus === "active";
  const showDowngradeToSmart =
    settings.currentTier === "pro" &&
    settings.billingStatus === "active" &&
    settings.pendingTier !== "smart";
  const showFixBilling = settings.billingStatus === "payment_issue";
  const showResumePlan = settings.billingStatus === "canceling";

  return (
    <div className="grid gap-4">
      <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,28,0.99),rgba(6,10,18,0.99))] p-5 shadow-[0_0_0_1px_rgba(34,211,238,0.05),0_20px_44px_rgba(0,0,0,0.28)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
              Your Plan
            </div>
            <div className="mt-3 grid gap-2 text-sm text-white/72">
              <div>
                <span className="text-white/52">Plan:</span> {planName}
                {settings.currentTier === "free" ? " (Free)" : ""}
              </div>
              {paidPlan ? (
                <div className="text-sm text-white/50">${paidPlan.priceMonthly}/month</div>
              ) : null}
              {urgencyLabel ? <div className="text-xs font-medium text-cyan-100/78">{urgencyLabel}</div> : null}
              <div>
                <span className="text-white/52">Status:</span> {statusLabel}
              </div>
              {detailLabel ? <div className="text-white/62">{detailLabel}</div> : null}
              {settings.pendingTier && settings.pendingTierEffectiveLabel ? (
                <div className="text-white/62">
                  Scheduled change: {getSigiTierCard(settings.pendingTier).name} on {settings.pendingTierEffectiveLabel}
                </div>
              ) : null}
              {upsellLabel ? <div className="text-white/62">{upsellLabel}</div> : null}
              {socialProofLabel ? <div className="text-xs text-white/52">{socialProofLabel}</div> : null}
              {upgradeTarget ? <div className="text-xs text-white/52">Cancel anytime. No commitment.</div> : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {settings.currentTier === "free" ? (
              <a
                href="/auth/upgrade?plan=smart"
                className="rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-400/20"
              >
                {primaryUpgradeLabel}
              </a>
            ) : null}

            {showManageBilling ? (
              <button
                type="button"
                onClick={() => void openBillingPortal()}
                disabled={!settings.isSignedIn || busyAction !== null}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/82 transition hover:border-white/18 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyAction === "portal"
                  ? "Opening billing"
                  : settings.billingCtaLabel}
              </button>
            ) : null}

            {showUpgradeToPro ? (
              <button
                type="button"
                onClick={() => void startUpgrade("pro")}
                disabled={!settings.isSignedIn || busyAction !== null}
                className="rounded-2xl border border-amber-200/18 bg-amber-200/8 px-4 py-2.5 text-sm font-medium text-amber-50 transition hover:border-amber-100/30 hover:bg-amber-200/12 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyAction === "pro" ? "Starting checkout" : primaryUpgradeLabel}
              </button>
            ) : null}

            {showDowngradeToSmart ? (
              <button
                type="button"
                onClick={() => void startDowngrade("smart")}
                disabled={!settings.isSignedIn || busyAction !== null}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/82 transition hover:border-white/18 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyAction === "downgrade-smart" ? "Scheduling downgrade" : "Downgrade to Smart next cycle"}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-3xl border border-rose-400/18 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}
    </div>
  );
}