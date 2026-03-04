import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", "http://localhost:3000"));
  }

  await supabase
    .from("profiles")
    .update({ is_pro: true })
    .eq("id", user.id);

  return NextResponse.redirect(new URL("/", "http://localhost:3000"));
}
