import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 }
      );
    }

    const { data: account, error: accountError } = await supabase
      .from("talent_accounts")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (accountError) {
      throw accountError;
    }

    if (!account) {
      return NextResponse.json({
        account: null,
        positions: [],
        trades: [],
      });
    }

    const [
      { data: positions, error: positionsError },
      { data: trades, error: tradesError },
    ] = await Promise.all([
      supabase
        .from("talent_positions")
        .select("*")
        .eq("account_id", account.id)
        .order("symbol"),

      supabase
        .from("talent_trades")
        .select("*")
        .eq("account_id", account.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (positionsError) {
      throw positionsError;
    }

    if (tradesError) {
      throw tradesError;
    }

    return NextResponse.json({
      account,
      positions: positions ?? [],
      trades: trades ?? [],
    });
  } catch (error) {
    console.error("Talent positions error:", error);

    return NextResponse.json(
      { error: "Unable to load Talent Portfolio." },
      { status: 500 }
    );
  }
}