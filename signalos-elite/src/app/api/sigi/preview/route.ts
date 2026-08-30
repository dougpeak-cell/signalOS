import { NextResponse } from "next/server";
import {
  getSmartPreviewStatusForCurrentUser,
  startSmartPreviewForCurrentUser,
} from "@/lib/sigi/smartPreviewServer";

export async function GET() {
  try {
    const status = await getSmartPreviewStatusForCurrentUser();
    return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load Smart preview status." },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const status = await startSmartPreviewForCurrentUser();

    if (!status.isSignedIn) {
      return NextResponse.json(
        { error: "Create or sign in to a Free account to start the Smart preview." },
        { status: 401 },
      );
    }

    if (!status.active) {
      return NextResponse.json(
        { error: "Your Smart preview is available once every seven days.", ...status },
        { status: 429 },
      );
    }

    return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to start Smart preview." },
      { status: 500 },
    );
  }
}
