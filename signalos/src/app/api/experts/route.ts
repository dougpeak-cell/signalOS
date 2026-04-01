import { NextRequest, NextResponse } from "next/server";
import { normalizeExpertProfileResponse } from "@/lib/experts/ranking";
import type { UpstreamExpertProfileResponse } from "@/lib/experts/types";

const DEFAULT_TIMEOUT_MS = 8000;

function getTimeoutMs(): number {
  const raw = Number(process.env.EXPERTS_UPSTREAM_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
}

function buildUpstreamUrl(slug: string): string | null {
  const base = process.env.EXPERTS_UPSTREAM_URL?.trim();
  if (!base) return null;

  const url = new URL(base);
  url.searchParams.set("slug", slug);
  return url.toString();
}

async function fetchUpstreamJson(url: string): Promise<UpstreamExpertProfileResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (process.env.EXPERTS_UPSTREAM_API_KEY) {
      headers.Authorization = `Bearer ${process.env.EXPERTS_UPSTREAM_API_KEY}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Upstream experts request failed: ${response.status} ${body}`);
    }

    return (await response.json()) as UpstreamExpertProfileResponse;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")?.trim();

  if (!slug) {
    return NextResponse.json(
      { error: "Missing required query param: slug" },
      { status: 400 }
    );
  }

  const upstreamUrl = buildUpstreamUrl(slug);

  if (!upstreamUrl) {
    return NextResponse.json(
      {
        error:
          "EXPERTS_UPSTREAM_URL is not configured. Add a real upstream endpoint before going live.",
      },
      { status: 503 }
    );
  }

  try {
    const upstream = await fetchUpstreamJson(upstreamUrl);
    const normalized = normalizeExpertProfileResponse(upstream, slug, new Date());

    return NextResponse.json(normalized, {
      status: 200,
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown experts route failure";

    return NextResponse.json(
      {
        error: "Failed to load expert profile",
        detail: message,
      },
      { status: 502 }
    );
  }
};