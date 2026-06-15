import { NextResponse } from "next/server";

export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    { error: "Personal provider settings are not available." },
    { status: 404 }
  );
}