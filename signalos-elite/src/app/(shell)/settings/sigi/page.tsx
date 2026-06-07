import Link from "next/link";
import PageHeaderBlock from "@/components/shell/PageHeaderBlock";
import {
  getSigiTierCard,
  SIGI_TIER_CARDS,
} from "@/lib/sigi/plans";
import { getSigiSettingsViewForCurrentUser } from "@/lib/sigi/settings";
import SigiBillingStateCard from "./SigiBillingStateCard";
import SigiPlanCards from "./SigiPlanCards";

export default async function SigiSettingsPage() {
  const settings = await getSigiSettingsViewForCurrentUser();

  return (
    <main id="profile" className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-16 pt-2 md:px-6 xl:px-8">
      <PageHeaderBlock
        eyebrow="SigiOS Settings"
        title="SigiOS Experts"
        description="Advanced institutional-grade intelligence reserved for Pro members. Access elite AI-driven market analysis, conviction setups, macro intelligence, analyst consensus, and premium trading workflows built for serious investors."
        actions={
          <div className="flex flex-wrap gap-3">
            <div className="inline-flex rounded-full border border-cyan-400/16 bg-cyan-400/6 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/88">
              Current plan: {getSigiTierCard(settings.currentTier).name}
            </div>
            <Link
              href="/"
              className="inline-flex rounded-2xl border border-white/12 bg-black/20 px-3 py-2 text-sm text-white/84 transition hover:bg-black/30"
            >
              Back to shell
            </Link>
          </div>
        }
      />

      <SigiBillingStateCard settings={settings} />

      <SigiPlanCards
        cards={SIGI_TIER_CARDS}
        currentTier={settings.currentTier}
        pendingTier={settings.pendingTier}
        pendingTierEffectiveLabel={settings.pendingTierEffectiveLabel}
      />

      <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,13,21,0.98),rgba(5,9,16,0.98))] p-5 md:p-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
          Legal
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-cyan-100">
          <Link
            href="/legal/terms-of-use"
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 transition hover:bg-black/30"
          >
            Terms of Use
          </Link>

          <Link
            href="/legal/privacy-policy"
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 transition hover:bg-black/30"
          >
            Privacy Policy
          </Link>

          <Link
            href="/legal/financial-disclosure"
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 transition hover:bg-black/30"
          >
            Financial & Investment Disclosure
          </Link>

          <Link
            href="/legal/ai-disclosure"
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 transition hover:bg-black/30"
          >
            AI Disclosure
          </Link>
        </div>
      </section>
    </main>
  );
}