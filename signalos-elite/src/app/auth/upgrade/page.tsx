import EmailAuthEntry from "@/components/auth/EmailAuthEntry";
import Link from "next/link";
import { MEMBERSHIP_PAUSE_MESSAGE, MEMBERSHIP_SIGNUPS_PAUSED } from "@/lib/billing/membershipAvailability";

export default function UpgradeAuthPage() {
  if (MEMBERSHIP_SIGNUPS_PAUSED) {
    return (
      <main className="mx-auto min-h-screen max-w-xl px-6 py-16 text-white">
        <h1 className="text-3xl font-semibold">Under construction</h1>
        <p className="mt-4 text-base leading-7 text-zinc-300">{MEMBERSHIP_PAUSE_MESSAGE}</p>
        <div className="mt-8 flex flex-wrap gap-6 text-sm">
          <Link href="/" className="text-amber-200 underline underline-offset-4">Back to SigiOS</Link>
          <Link href="/settings/sigi#billing" className="text-zinc-300 underline underline-offset-4">Existing member billing</Link>
        </div>
      </main>
    );
  }

  return (
    <EmailAuthEntry
      badgeLabel="Upgrade Access"
      title="Create your SigiOS account"
      description="Use your email to save your watchlist, portfolio, settings, and billing access securely."
      successMessage="Check your inbox for your SigiOS confirmation email. After you confirm, we will keep you signed in and continue to secure checkout."
      footerMessage="Use the same email for either sign in or account creation. SigiOS will confirm your account, keep you in the same flow, and take you into billing securely. Cancel anytime from billing."
      backHref="/experts"
      backLabel="Back to Experts Overview"
      defaultNextPath="/settings/sigi#billing"
    />
  );
}