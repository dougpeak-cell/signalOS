import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type TradeBody = {
  symbol?: string;
  side?: "buy" | "sell";
  quantity?: number;
  price?: number;
};

export async function POST(request: NextRequest) {
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

    const body = (await request.json()) as TradeBody;

    const symbol = body.symbol?.trim().toUpperCase();
    const side = body.side;
    const quantity = Number(body.quantity);
    const price = Number(body.price);

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol is required." },
        { status: 400 }
      );
    }

    if (side !== "buy" && side !== "sell") {
      return NextResponse.json(
        { error: "Trade side must be buy or sell." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: "Quantity must be greater than zero." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { error: "Valid market price is required." },
        { status: 400 }
      );
    }

    const talentAmount = Number((quantity * price).toFixed(2));

    // --------------------------------------------------------
    // Load or create Talent account
    // --------------------------------------------------------

    const { data: existingAccount, error: accountError } = await supabase
      .from("talent_accounts")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (accountError) {
      throw accountError;
    }

    let account = existingAccount;

    if (!account) {
      const { data: createdAccount, error: createError } = await supabase
        .from("talent_accounts")
        .insert({
          user_id: user.id,
          starting_talents: 100000,
          cash_talents: 100000,
        })
        .select("*")
        .single();

      if (createError) {
        throw createError;
      }

      account = createdAccount;
    }

    // --------------------------------------------------------
    // Current position
    // --------------------------------------------------------

    const { data: existingPosition, error: positionError } =
      await supabase
        .from("talent_positions")
        .select("*")
        .eq("account_id", account.id)
        .eq("symbol", symbol)
        .maybeSingle();

    if (positionError) {
      throw positionError;
    }

    // ========================================================
    // BUY
    // ========================================================

    if (side === "buy") {
      const availableCash = Number(account.cash_talents);

      if (talentAmount > availableCash) {
        return NextResponse.json(
          {
            error: `Not enough Talents. You have ${availableCash.toLocaleString()} Talents available.`,
          },
          { status: 400 }
        );
      }

      const oldQuantity = Number(existingPosition?.quantity ?? 0);
      const oldAveragePrice = Number(
        existingPosition?.average_price ?? 0
      );

      const newQuantity = oldQuantity + quantity;

      const newAveragePrice =
        newQuantity > 0
          ? (oldQuantity * oldAveragePrice + quantity * price) /
            newQuantity
          : price;

      if (existingPosition) {
        const { error } = await supabase
          .from("talent_positions")
          .update({
            quantity: newQuantity,
            average_price: newAveragePrice,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingPosition.id)
          .eq("user_id", user.id);

        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase
          .from("talent_positions")
          .insert({
            user_id: user.id,
            account_id: account.id,
            symbol,
            quantity,
            average_price: price,
          });

        if (error) {
          throw error;
        }
      }

      const newCash = Number(
        (availableCash - talentAmount).toFixed(2)
      );

      const { error: cashError } = await supabase
        .from("talent_accounts")
        .update({
          cash_talents: newCash,
          updated_at: new Date().toISOString(),
        })
        .eq("id", account.id)
        .eq("user_id", user.id);

      if (cashError) {
        throw cashError;
      }
    }

    // ========================================================
    // SELL
    // ========================================================

    if (side === "sell") {
      if (!existingPosition) {
        return NextResponse.json(
          { error: `You do not own ${symbol} in your Talent Portfolio.` },
          { status: 400 }
        );
      }

      const currentQuantity = Number(existingPosition.quantity);

      if (quantity > currentQuantity) {
        return NextResponse.json(
          {
            error: `You only have ${currentQuantity} shares of ${symbol} in your Talent Portfolio.`,
          },
          { status: 400 }
        );
      }

      const remainingQuantity = currentQuantity - quantity;

      if (remainingQuantity <= 0) {
        const { error } = await supabase
          .from("talent_positions")
          .delete()
          .eq("id", existingPosition.id)
          .eq("user_id", user.id);

        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase
          .from("talent_positions")
          .update({
            quantity: remainingQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingPosition.id)
          .eq("user_id", user.id);

        if (error) {
          throw error;
        }
      }

      const newCash = Number(
        (Number(account.cash_talents) + talentAmount).toFixed(2)
      );

      const { error: cashError } = await supabase
        .from("talent_accounts")
        .update({
          cash_talents: newCash,
          updated_at: new Date().toISOString(),
        })
        .eq("id", account.id)
        .eq("user_id", user.id);

      if (cashError) {
        throw cashError;
      }
    }

    // --------------------------------------------------------
    // Record simulated trade
    // --------------------------------------------------------

    const { error: tradeError } = await supabase
      .from("talent_trades")
      .insert({
        user_id: user.id,
        account_id: account.id,
        symbol,
        side,
        quantity,
        execution_price: price,
        talent_amount: talentAmount,
      });

    if (tradeError) {
      throw tradeError;
    }

    return NextResponse.json({
      success: true,
      symbol,
      side,
      quantity,
      executionPrice: price,
      talentAmount,
    });
  } catch (error) {
    console.error("Talent trade error:", error);

    return NextResponse.json(
      { error: "Unable to complete Talent trade." },
      { status: 500 }
    );
  }
}