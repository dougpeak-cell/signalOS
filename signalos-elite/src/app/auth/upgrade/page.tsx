import EmailAuthEntry from "@/components/auth/EmailAuthEntry";

export default function UpgradeAuthPage() {
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