import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  calculateFutureMap,
  type AMSAFutureMapInput,
} from "@/lib/amsa";

export const dynamic =
  "force-dynamic";

type RequestBody = {
  input?: AMSAFutureMapInput;
};

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      (await request.json()) as RequestBody;

    if (!body.input) {
      return NextResponse.json(
        {
          error:
            "FutureMap input is required.",
        },
        {
          status: 400,
        },
      );
    }

    const futureMap =
      calculateFutureMap(
        body.input,
      );

    return NextResponse.json({
      success: true,
      futureMap,
    });
  } catch (error) {
    console.error(
      "FutureMap calculation error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "FutureMap could not complete the calculation.",
      },
      {
        status: 500,
      },
    );
  }
}