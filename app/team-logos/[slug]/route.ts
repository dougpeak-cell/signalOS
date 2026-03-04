import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Ctx = {
  params: { slug: string };
};

export async function GET(_req: Request, ctx: Ctx) {
  const slug = ctx.params.slug;

  const supabase = await createSupabaseServerClient();

  // Assumes you store logos in Supabase Storage bucket: "team-logos"
  // And files are named by slug, e.g. "duke.png" or "duke.svg"
  const { data } = supabase.storage.from("team-logos").getPublicUrl(slug);

  // If you’re storing full paths like "ncaab/duke.png", slug can include that too.
  return NextResponse.redirect(data.publicUrl, { status: 302 });
}
