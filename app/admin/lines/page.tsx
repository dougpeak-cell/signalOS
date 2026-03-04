import { createSupabaseServerClient } from "@/lib/supabase/server";
import AdminLinesClient from "./ui";

export default async function AdminLinesPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data?.user) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-black">Admin: Lines</h1>
        <p className="mt-2 text-sm text-gray-600">Please log in to use this page.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-black">Admin: Lines</h1>
      <p className="mt-2 text-sm text-gray-600">
        Pull sportsbook lines into <code>sportsbook_lines</code>.
      </p>
      <AdminLinesClient />
    </main>
  );
}