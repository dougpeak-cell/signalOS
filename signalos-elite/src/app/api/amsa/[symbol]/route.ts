import { NextRequest, NextResponse } from "next/server";
import {
  resolveCurrentStockPulse,
} from "@/lib/amsa";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    symbol: string;
  }>;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { symbol: rawSymbol } = await context.params;
    const symbol = rawSymbol.trim().toUpperCase();

    if (!/^[A-Z0-9.^-]{1,12}$/.test(symbol)) {
      return NextResponse.json(
        {
          error: "Invalid stock symbol.",
        },
        {
          status: 400,
        },
      );
    }

    const { current, pulse } = await resolveCurrentStockPulse(symbol);

    return NextResponse.json({
      success: true,
      ...current,
      pulse,
      score: current.rawPulse,
      updatedAt: current.asOf,
    });
  } catch (error) {
    console.error("AMSA route error:", error);

    return NextResponse.json(
      {
        error: "AMSA could not calculate the stock Pulse.",
      },
      {
        status: 500,
      },
    );
  }
}
