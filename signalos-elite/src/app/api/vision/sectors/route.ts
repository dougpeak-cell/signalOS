import { NextResponse } from "next/server";
import {
  getLiveSectorComparison,
  type VisionSector,
} from "@/lib/market/sectorComparison";

export const dynamic = "force-dynamic";

export type VisionSectorsResponse = {
  ok: boolean;
  updatedAt?: string;
  sectors: VisionSector[];
  error?: string;
};

export async function GET() {
  try {
    const sectors = await getLiveSectorComparison();

    return NextResponse.json({
      ok: true,
      updatedAt: new Date().toISOString(),
      sectors,
    } satisfies VisionSectorsResponse);
  } catch (error) {
    console.error("Vision sector error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Sector intelligence is temporarily unavailable.",
        sectors: [],
      } satisfies VisionSectorsResponse,
      { status: 500 }
    );
  }
}