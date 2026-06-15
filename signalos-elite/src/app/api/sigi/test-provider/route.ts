import { NextResponse } from "next/server";

export async function POST(req: Request) {
  void req;
  return NextResponse.json(
    {
      ok: false,
      error: "Personal provider testing is not available.",
    },
    { status: 404 }
  );
}