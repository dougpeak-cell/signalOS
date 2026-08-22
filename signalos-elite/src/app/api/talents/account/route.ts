import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const STARTING_TALENTS = 100_000;

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 }
      );
    }

    const { data: existing, error: existingError } = await supabase
      .from("talent_accounts")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing) {
      return NextResponse.json({
        account: existing,
      });
    }

    const { data: account, error: insertError } = await supabase
      .from("talent_accounts")
      .insert({
        user_id: user.id,
        starting_talents: STARTING_TALENTS,
        cash_talents: STARTING_TALENTS,
      })
      .select("*")
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      account,
    });
  } catch (error) {
    console.error("Talent account error:", error);

    return NextResponse.json(
      { error: "Unable to load Talent account." },
      { status: 500 }
    );
  }
}