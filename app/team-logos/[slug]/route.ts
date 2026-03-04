import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Ctx = {
  params: { slug: string };
};

export async function GET(_req: Request, ctx: Ctx) {
  const slug = ctx.params.slug;

  const supabase = await createSupabaseServerClient();

  // Bucket: "team-logos"
  // slug can be a full path like "ncaab/duke.png" if you pass it that way.
  const { data } = supabase.storage.from("team-logos").getPublicUrl(slug);

  // If publicUrl isn't present for any reason, avoid crashing the build
  const url = data?.publicUrl;
  if (!url) {
    return NextResponse.json({ error: "Logo not found" }, { status: 404 });
  }

  // Redirect to the public logo URL
  return NextResponse.redirect(url, { status: 302 });
}