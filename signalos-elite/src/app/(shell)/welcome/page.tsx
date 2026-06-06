import Link from "next/link";
import { CheckCircle2, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { reconcileStripeSubscriptionStateForCurrentUser } from "@/lib/billing/checkout";
import PageHeaderBlock from "@/components/shell/PageHeaderBlock";
import { getSigiTierCard } from "@/lib/sigi/plans";
import { getSigiSettingsViewForCurrentUser } from "@/lib/sigi/settings";

type WelcomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type UpgradePlan = "smart" | "pro";

function getSingleParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : null;
  }

  return null;
}

function getSafePlan(value: string | null): UpgradePlan | null {
  return value === "smart" || value === "pro" ? value : null;
}

function getSafeReturnTo(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

function getContinueLabel(returnTo: string | null): string {
  if (!returnTo) {
    return "Open SigiOS";
  }

  if (returnTo === "/today") {
    return "Open Today";
  }

  if (returnTo.startsWith("/experts")) {
    return "Open Experts";
  }

  if (returnTo.startsWith("/settings/sigi")) {
    return "Open plan settings";
  }

  return "Continue into SigiOS";
}

function getTierRank(value: UpgradePlan | "free"): number {
  if (value === "pro") {
    return 2;
  }

  if (value === "smart") {
    return 1;
  }

  return 0;
}

export default async function WelcomePage({ searchParams }: WelcomePageProps) {
  const query = (await searchParams) ?? {};
  const requestedPlan = getSafePlan(getSingleParam(query.plan));
  const returnTo = getSafeReturnTo(getSingleParam(query.returnTo));
  const isCheckoutSuccess = getSingleParam(query.checkout) === "success";

  let settings = await getSigiSettingsViewForCurrentUser();

  if (!settings.isSignedIn) {
    redirect("/auth?next=/welcome");
  }

  if (
    isCheckoutSuccess &&
    requestedPlan &&
    getTierRank(settings.currentTier) < getTierRank(requestedPlan)
  ) {
    await reconcileStripeSubscriptionStateForCurrentUser(requestedPlan);
    settings = await getSigiSettingsViewForCurrentUser({ bypassProfileCache: true });
  }

  const activeTier = requestedPlan ?? (settings.currentTier === "smart" || settings.currentTier === "pro" ? settings.currentTier : null);
  const tierCard = getSigiTierCard(activeTier ?? settings.currentTier);
  const continueHref = returnTo ?? "/today";
  const continueLabel = getContinueLabel(returnTo);
  const planLabel = activeTier ? tierCard.name : "SigiOS";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-16 pt-2 md:px-6 xl:px-8">
      <PageHeaderBlock
        eyebrow="SigiOS Welcome"
        title={isCheckoutSuccess ? `Welcome to ${planLabel}` : "Welcome to SigiOS"}
        description={
          isCheckoutSuccess
            ? `Your account is confirmed, you are signed in, and your ${planLabel} setup is ready to use.`
            : "Your account is confirmed and you are signed in. Pick up where you left off."
        }
        actions={
          <div className="flex flex-wrap gap-3">
            <Link
              href={continueHref}
              className="inline-flex rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/18"
            >
              {continueLabel}
            </Link>
            <Link
              href="/settings/sigi#billing"
              className="inline-flex rounded-2xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/82 transition hover:bg-white/10"
            >
              Manage plan
            </Link>
          </div>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,28,0.99),rgba(6,10,18,0.99))] p-5 shadow-[0_0_0_1px_rgba(34,211,238,0.05),0_20px_44px_rgba(0,0,0,0.28)]">
          <div className="flex items-center gap-3 text-cyan-100">
            <CheckCircle2 className="h-5 w-5" />
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
              Account ready
            </div>
          </div>

          <div className="mt-4 grid gap-3 text-sm leading-6 text-white/72">
            <p>
              Your email confirmation is complete and this browser is now signed into SigiOS.
            </p>
            <p>
              {activeTier
                ? `${tierCard.name} access is attached to this account. If billing data takes a moment to refresh, your access will continue syncing in the background.`
                : "Your account is active and ready to use across watchlists, portfolio tracking, and Sigi settings."}
            </p>
          </div>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,14,24,0.98),rgba(5,9,17,0.98))] p-5">
          <div className="flex items-center gap-3 text-white">
            <Sparkles className="h-5 w-5 text-amber-200" />
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-white/72">
              Next steps
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-white/8 bg-black/16 px-4 py-3 text-sm text-white/72">
              Start in Today to see your live Sigi experience.
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/16 px-4 py-3 text-sm text-white/72">
              Open plan settings any time to review billing and upgrade details.
            </div>
            {returnTo ? (
              <div className="rounded-2xl border border-cyan-400/14 bg-cyan-400/8 px-4 py-3 text-sm text-cyan-100/82">
                We kept your original destination ready: {returnTo}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
