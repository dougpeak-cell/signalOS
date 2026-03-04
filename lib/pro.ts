import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getProStatus() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, isPro: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_pro")
    .eq("id", user.id)
    .maybeSingle();

  return { user, isPro: !!profile?.is_pro };
}
