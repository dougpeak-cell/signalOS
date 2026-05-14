import EmailAuthEntry from "@/components/auth/EmailAuthEntry";

export default function AuthPage() {
  return (
    <EmailAuthEntry
      badgeLabel="Account Access"
      title="Create your SignalOS account"
      description="Use your email to save your watchlist, portfolio, settings, and billing access securely."
      successMessage="Check your email for the secure sign-in link to finish opening your account."
      footerMessage="Use the same email every time. If the account does not exist yet, SignalOS will create it and bring you back automatically."
      backHref="/"
      backLabel="Back to SignalOS"
      defaultNextPath="/settings/sigi#profile"
    />
  );
}