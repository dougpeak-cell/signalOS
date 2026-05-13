import Link from "next/link";
import PageHeaderBlock from "@/components/shell/PageHeaderBlock";
import {
  getSigiComparisonRows,
  getSigiTierCard,
  SIGI_TIER_CARDS,
} from "@/lib/sigi/plans";
import { getSigiSettingsViewForCurrentUser } from "@/lib/sigi/settings";
import SigiBillingStateCard from "./SigiBillingStateCard";
import SigiPlanCards from "./SigiPlanCards";
import SigiSettingsForm from "./SigiSettingsForm";

export default async function SigiSettingsPage() {
  const settings = await getSigiSettingsViewForCurrentUser();
  const comparisonRows = getSigiComparisonRows();

  return (
    <main id="profile" className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-16 pt-2 md:px-6 xl:px-8">
      <PageHeaderBlock
        eyebrow="SigiOS Settings"
        title="Meet the full power of Sigi"
        description="Sigi AI works instantly with zero setup. Your plan controls how personal and how powerful it becomes. Advanced AI Settings are optional for power users who want their own provider."
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

      <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,14,24,0.98),rgba(5,9,17,0.98))] p-5 shadow-[0_0_0_1px_rgba(34,211,238,0.04),0_18px_42px_rgba(0,0,0,0.24)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
          See the difference
        </div>
        <div className="mt-2 max-w-3xl text-sm leading-6 text-white/62">
          Before users compare plans, show them how the same market moment feels with basic Sigi versus the full Pro operator experience.
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <article className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(8,13,21,0.98),rgba(5,9,16,0.98))] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/48">
                  Free Sigi
                </div>
                <div className="mt-1 text-lg font-semibold text-white">Helpful, but basic</div>
              </div>

              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/72">
                Standard response
              </div>
            </div>

            <div className="mt-4 rounded-[22px] border border-white/8 bg-black/20 px-4 py-4 text-sm leading-6 text-white/74">
              “MBOT looks interesting. You may want to review recent movement and news.”
            </div>
          </article>

          <article className="relative overflow-hidden rounded-[28px] border border-amber-200/18 bg-[linear-gradient(180deg,rgba(15,11,19,0.99),rgba(8,7,13,0.99))] p-4 shadow-[0_0_0_1px_rgba(250,204,21,0.06),0_20px_48px_rgba(0,0,0,0.28)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.16),transparent_38%),radial-gradient(circle_at_left_center,rgba(34,211,238,0.10),transparent_34%)] opacity-100" />

            <div className="relative flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100/70">
                  Sigi Pro
                </div>
                <div className="mt-1 text-lg font-semibold text-white">Works like an operator</div>
              </div>

              <div className="rounded-full border border-amber-200/18 bg-amber-200/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-50">
                Pro response
              </div>
            </div>

            <div className="relative mt-4 rounded-[22px] border border-white/8 bg-black/20 px-4 py-4 text-sm leading-6 text-white/78">
              “MBOT is showing elevated RVOL with a developing catalyst. The current structure suggests early momentum continuation, but liquidity risk remains. Watch for confirmation above...”
            </div>
          </article>
        </div>
      </section>

      <SigiPlanCards cards={SIGI_TIER_CARDS} currentTier={settings.currentTier} />

      <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,13,21,0.98),rgba(5,9,16,0.98))] p-3 md:p-4">
        <details className="group rounded-3xl border border-white/8 bg-black/12">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-left marker:hidden">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
                Why upgrade Sigi
              </div>
              <div className="mt-1 text-sm text-white/62">
                Keep this closed for speed, or open it for a quick side-by-side on what Smart and Pro actually change.
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/72 transition group-open:border-cyan-300/20 group-open:bg-cyan-400/8 group-open:text-cyan-100">
              <span>Why upgrade Sigi</span>
              <span className="transition group-open:rotate-90">&gt;</span>
            </div>
          </summary>

          <div className="border-t border-white/8 px-3 pb-3 pt-2 md:px-4 md:pb-4">
            <div className="overflow-hidden rounded-3xl border border-white/8 bg-black/16">
              <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,0.85fr)_minmax(0,0.95fr)_minmax(0,0.95fr)] border-b border-white/8 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/48">
                <div>Capability</div>
                <div>Sigi</div>
                <div>Sigi Smart</div>
                <div>Sigi Pro</div>
              </div>

              {comparisonRows.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,0.85fr)_minmax(0,0.95fr)_minmax(0,0.95fr)] border-t border-white/6 px-4 py-3 text-sm text-white/72 first:border-t-0"
                >
                  <div className="font-medium text-white/86">{row.label}</div>
                  <div>{row.free}</div>
                  <div>{row.smart}</div>
                  <div>{row.pro}</div>
                </div>
              ))}
            </div>
          </div>
        </details>
      </section>

      <SigiSettingsForm settings={settings} />
    </main>
  );
}