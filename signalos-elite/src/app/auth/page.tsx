import { redirect } from "next/navigation";
import EmailAuthEntry from "@/components/auth/EmailAuthEntry";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AuthPageProps = {
  searchParams: Promise<{ next?: string }>;
};

function getSafeNextPath(value: string | undefined): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/today";
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const nextPath = getSafeNextPath((await searchParams).next);
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect(`/auth/confirm?next=${encodeURIComponent(nextPath)}`);
  }

  return (
    <EmailAuthEntry
      badgeLabel="Account Access"
      title="Sign in to SigiOS"
      description="Use the email connected to your membership to restore your Pro access, watchlist, portfolio, and settings."
      successMessage="Check your inbox for a secure SigiOS sign-in email."
      footerMessage="Use the email connected to your existing SigiOS membership."
      backHref="/"
      backLabel="Back to SigiOS"
      defaultNextPath="/today"
      skipSessionCheck
    />
  );
}