import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
// Update the import path if the file is named differently or in a subfolder
// Example: If the file is named AdminBackfillButton.tsx and is in components/admin/
import AdminBackfillButton from "@/components/admin/AdminBackfillButton";

function isAdmin(email: string | null | undefined) {
  if (!email) return false;
  const allow = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}

export default async function AdminResultsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();

  const email = auth?.user?.email;
  if (!isAdmin(email)) {
    return (
      <main className="mx-auto max-w-3xl p-6 space-y-4">
        <Link href="/" className="underline">← Back</Link>
        <div className="rounded-2xl border bg-white p-6">
          <div className="text-xl font-bold">Not authorized</div>
          <div className="text-sm text-slate-600 mt-1">
            This page is restricted.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <Link href="/" className="underline">← Back</Link>

      <div className="rounded-2xl border bg-white p-6 space-y-3">
        <div className="text-2xl font-bold">Admin: Backfill Results</div>
        <div className="text-sm text-slate-600">
          Fetches completed game boxscores and upserts into <code>player_game_stats</code>.
        </div>

        <AdminBackfillButton />
      </div>
    </main>
  );
}
