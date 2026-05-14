import EmailAuthEntry from "@/components/auth/EmailAuthEntry";

export default function AuthPage() {
  return (
    <EmailAuthEntry
      badgeLabel="Account Access"
      title="Sign in or create your SignalOS account."
      description="Use your email to securely access your profile, settings, watchlists, and billing without waiting until checkout to create an account."
      successMessage="Check your email for the secure sign-in link to finish opening your account."
      footerMessage="Use the same email every time. If the account does not exist yet, SignalOS will create it and bring you back automatically."
      backHref="/"
      backLabel="Back to SignalOS"
      defaultNextPath="/settings/sigi#profile"
    />
  );
}