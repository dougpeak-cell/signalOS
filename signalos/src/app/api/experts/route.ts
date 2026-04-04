import { NextRequest, NextResponse } from "next/server";
import { getSeededExpertProfile } from "@/lib/experts/data";

const EXPERTS_UPSTREAM_URL = process.env.EXPERTS_UPSTREAM_URL;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = String(searchParams.get("slug") ?? "")
      .trim()
      .toLowerCase();

    if (!slug) {
      return NextResponse.json(
        { error: "Missing required slug parameter." },
        { status: 400 }
      );
    }

    if (EXPERTS_UPSTREAM_URL) {
      try {
        const upstreamUrl = new URL(EXPERTS_UPSTREAM_URL);
        upstreamUrl.searchParams.set("slug", slug);

        const response = await fetch(upstreamUrl.toString(), {
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        });

        const text = await response.text();
        const json = text ? JSON.parse(text) : null;

        if (!response.ok) {
          throw new Error(
            json?.detail ||
              json?.error ||
              `Upstream returned ${response.status}`
          );
        }

        return NextResponse.json(json, { status: 200 });
      } catch (upstreamError) {
        const fallback = getSeededExpertProfile(slug);

        if (fallback) {
          return NextResponse.json(fallback, {
            status: 200,
            headers: {
              "x-experts-source": "seeded-fallback",
            },
          });
        }

        throw upstreamError;
      }
    }

    const seeded = getSeededExpertProfile(slug);

    if (!seeded) {
      return NextResponse.json(
        { error: `No expert profile found for slug "${slug}".` },
        { status: 404 }
      );
    }

    return NextResponse.json(seeded, {
      status: 200,
      headers: {
        "x-experts-source": "seeded",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load expert profile.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}