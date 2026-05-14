import EmailAuthEntry from "@/components/auth/EmailAuthEntry";

export default function UpgradeAuthPage() {
  return (
    <EmailAuthEntry
      badgeLabel="Upgrade Access"
      title="Create your SignalOS account"
      description="Use your email to save your watchlist, portfolio, settings, and billing access securely."
      successMessage="Check your email for the secure sign-in link to continue to checkout."
      footerMessage="Use the same email for either sign in or account creation. We will continue straight to billing after authentication."
      backHref="/experts"
      backLabel="Back to Experts Overview"
      defaultNextPath="/settings/sigi#billing"
    />
  );
}