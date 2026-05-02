import { NextResponse } from "next/server";
import { hasSmart, normalizeSigiTier } from "@/lib/sigi/gates";
import { callOpenAICompatibleProvider } from "@/lib/sigi/provider";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type TestProviderBody = {
  baseUrl?: string;
  model?: string;
  apiKey?: string;
};

type ProviderProfileRow = {
  sigi_tier?: string | null;
};

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("sigi_tier")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ ok: false, error: profileError.message }, { status: 400 });
    }

    const currentTier = normalizeSigiTier((profile as ProviderProfileRow | null)?.sigi_tier);
    if (!hasSmart(currentTier)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Custom provider testing requires Sigi Smart or Pro.",
        },
        { status: 403 }
      );
    }

    const body = (await req.json()) as TestProviderBody;

    const baseUrl = body.baseUrl?.trim();
    const model = body.model?.trim();
    const apiKey = body.apiKey?.trim();

    if (!baseUrl || !model || !apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing baseUrl, model, or apiKey.",
        },
        { status: 400 }
      );
    }

    const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

    const result = await callOpenAICompatibleProvider({
      baseUrl: normalizedBaseUrl,
      apiKey,
      model,
      messages: [
        {
          role: "system",
          content: "You are a provider connectivity test.",
        },
        {
          role: "user",
          content: 'Reply with exactly: "ok"',
        },
      ],
      temperature: 0,
      maxTokens: 5,
      timeoutMs: 12000,
    });

    if (!result.ok) {
      const status = result.error === "Provider request timed out." ? 408 : 400;
      return NextResponse.json(
        {
          ok: false,
          error: result.error,
          details: result.details,
        },
        { status }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Provider connected successfully.",
      reply: result.content,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid request body.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 }
    );
  }
}