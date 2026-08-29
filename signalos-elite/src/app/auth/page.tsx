import EmailAuthEntry from "@/components/auth/EmailAuthEntry";

export default function AuthPage() {
  return (
    <EmailAuthEntry
      badgeLabel="Account Access"
      title="Sign in to SigiOS"
      description="Use the email connected to your membership to restore your Pro access, watchlist, portfolio, and settings."
      successMessage="Check your inbox for a secure SigiOS sign-in email."
      footerMessage="Use the email connected to your existing SigiOS membership."
      backHref="/"
      backLabel="Back to SigiOS"
      defaultNextPath="/welcome"
    />
  );
}