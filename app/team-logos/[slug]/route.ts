import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  const supabase = await createSupabaseServerClient();

  const { data } = supabase.storage.from("team-logos").getPublicUrl(slug);

  const url = data?.publicUrl;
  if (!url) {
    return NextResponse.json({ error: "Logo not found" }, { status: 404 });
  }

  return NextResponse.redirect(url, { status: 302 });
}