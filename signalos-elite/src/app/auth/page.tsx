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
      badgeLabel="Free Account Access"
      title="Sign in or create a free account"
      description="Enter your email to continue. New users get a free SigiOS account, while returning members restore their access, watchlist, portfolio, and settings."
      successMessage="Check your inbox for a secure SigiOS access email."
      footerMessage="Create a free account. No card required."
      backHref="/"
      backLabel="Back to SigiOS"
      defaultNextPath="/today"
      skipSessionCheck
    />
  );
}