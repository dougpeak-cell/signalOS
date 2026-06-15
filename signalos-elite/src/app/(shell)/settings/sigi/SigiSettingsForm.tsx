"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { startStripeUpgradeCheckout } from "@/lib/billing/client";
import type { SigiUserSettingsView } from "@/lib/sigi/settings";

type Props = {
  settings: SigiUserSettingsView;
};

export default function SigiSettingsForm({ settings }: Props) {
  const [billingError, setBillingError] = useState<string | null>(null);
  const [isStartingProUpgrade, setIsStartingProUpgrade] = useState(false);

  return (
    <div className="grid gap-4">
      <div id="settings" className="hidden" />
      <div id="billing" className="hidden" />

      {billingError ? (
        <div className="rounded-3xl border border-rose-400/18 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {billingError}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,13,21,0.98),rgba(5,9,16,0.98))] p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
          Hosted Sigi AI
        </div>
        <div className="mt-2 text-lg font-semibold text-white">Managed by SignalOS</div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/62">
          Sigi AI is fully managed for users. Personal provider routing is not available in the product.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Status</div>
            <div className="mt-2 text-sm font-medium text-white">{settings.hostedAiStatus}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Provider</div>
            <div className="mt-2 text-sm font-medium text-white">{settings.provider}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Model</div>
            <div className="mt-2 text-sm font-medium text-white">{settings.model}</div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/72">
          {settings.hostedAiSubtext}
        </div>
      </section>

      {!settings.hasProFeatures ? (
        <section className="relative overflow-hidden rounded-[30px] border border-amber-300/18 bg-[linear-gradient(180deg,rgba(15,11,19,0.99),rgba(7,8,14,0.99))] p-5 shadow-[0_0_0_1px_rgba(250,204,21,0.06),0_20px_48px_rgba(0,0,0,0.28)] md:p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.16),transparent_34%),radial-gradient(circle_at_left_center,rgba(34,211,238,0.12),transparent_36%)]" />

          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.9fr)] lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/18 bg-amber-200/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100/78">
                <Lock className="h-3.5 w-3.5 text-amber-200 drop-shadow-[0_0_10px_rgba(250,204,21,0.55)]" />
                <span>Pro Intelligence</span>
              </div>

              <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/78">
                SigiOS Experts
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-[0.01em] text-white md:text-4xl">
                Advanced institutional-grade intelligence reserved for Pro members.
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/72">
                Access elite AI-driven market analysis, conviction setups, macro intelligence,
                analyst consensus, and premium trading workflows built for serious investors.
              </p>

              <div className="mt-6 rounded-[28px] border border-white/10 bg-black/24 p-5 backdrop-blur-xl">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100/74">
                  Pro Intelligence
                </div>
                <div className="mt-3 text-xl font-semibold text-white">
                  Expert market intelligence is reserved for SigiOS Pro members.
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/68">
                  Unlock institutional-grade setups, advanced AI analysis, analyst conviction tracking,
                  and elite market workflows.
                </p>

                <button
                  type="button"
                  onClick={async () => {
                    setIsStartingProUpgrade(true);
                    setBillingError(null);

                    try {
                      await startStripeUpgradeCheckout("pro");
                    } catch (error) {
                      setBillingError(
                        error instanceof Error ? error.message : "Unable to start checkout"
                      );
                      setIsStartingProUpgrade(false);
                    }
                  }}
                  disabled={!settings.isSignedIn || isStartingProUpgrade}
                  className="mt-5 rounded-2xl border border-amber-200/20 bg-amber-200/10 px-5 py-3 text-sm font-semibold text-amber-50 transition hover:border-amber-100/30 hover:bg-amber-200/14 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isStartingProUpgrade ? "Starting checkout" : "Upgrade to Pro"}
                </button>
              </div>
            </div>

            <div className="grid gap-3">
              {[
                {
                  label: "Top Conviction Setup",
                  value: "NVDA Breakout Continuation",
                  metric: "+93 conviction",
                  tone: "cyan",
                },
                {
                  label: "Macro Regime Shift",
                  value: "Risk-on rotation building",
                  metric: "Fed beta rising",
                  tone: "amber",
                },
                {
                  label: "AI Risk Score",
                  value: "18 / 100",
                  metric: "Low event risk",
                  tone: "emerald",
                },
              ].map((card) => (
                <article
                  key={card.label}
                  className="relative overflow-hidden rounded-[26px] border border-white/10 bg-white/6 p-4 backdrop-blur-2xl"
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.10),transparent_36%)] opacity-70" />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b from-white/8 to-transparent opacity-70 blur-xl" />
                  <div className="relative">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/52">
                        {card.label}
                      </div>
                      <div className="rounded-full border border-white/10 bg-black/24 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/62">
                        Live preview
                      </div>
                    </div>

                    <div className="mt-3 text-lg font-semibold text-white/92 blur-[0.2px]">
                      {card.value}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-sm text-white/62">
                      <span>{card.metric}</span>
                      <span
                        className={[
                          "inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                          card.tone === "cyan"
                            ? "bg-cyan-400/10 text-cyan-200"
                            : card.tone === "amber"
                              ? "bg-amber-200/10 text-amber-100"
                              : "bg-emerald-400/10 text-emerald-200",
                        ].join(" ")}
                      >
                        Pro
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 opacity-80 blur-[1px]">
                      <div className="h-12 rounded-2xl border border-white/8 bg-white/6" />
                      <div className="h-12 rounded-2xl border border-white/8 bg-white/6" />
                      <div className="h-12 rounded-2xl border border-white/8 bg-white/6" />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}