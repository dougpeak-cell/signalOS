import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")

  if (code) {
    const supabase = await createSupabaseServerClient()

    await supabase.auth.exchangeCodeForSession(code)
  }

  return Response.redirect(new URL("/", request.url))
}
