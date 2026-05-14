import EmailAuthEntry from "@/components/auth/EmailAuthEntry";

export default function UpgradeAuthPage() {
  return (
    <EmailAuthEntry
      badgeLabel="Upgrade Access"
      title="Sign in or create your account before checkout."
      description="This keeps billing tied to a real SignalOS account, activates Smart or Pro immediately after purchase, and gives you a clean subscription history from day one."
      successMessage="Check your email for the secure sign-in link to continue to checkout."
      footerMessage="Use the same email for either sign in or account creation. We will continue straight to billing after authentication."
      backHref="/experts"
      backLabel="Back to Experts Overview"
      defaultNextPath="/settings/sigi#billing"
    />
  );
}