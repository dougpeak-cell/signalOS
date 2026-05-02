import { NextResponse } from "next/server";
import { encrypt } from "@/lib/security/encryption";
import { hasSmart, normalizeSigiTier } from "@/lib/sigi/gates";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SigiSettingsRequestBody = {
  enabled?: boolean;
  baseUrl?: string | null;
  model?: string | null;
  label?: string | null;
  apiKey?: string | null;
};

type AuthenticatedUser = {
  id: string;
};

type ProviderProfileRow = {
  sigi_tier?: string | null;
  sigi_provider_api_key_encrypted?: string | null;
};

async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return { id: user.id };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SigiSettingsRequestBody;

    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("sigi_tier, sigi_provider_api_key_encrypted")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    const currentTier = normalizeSigiTier((profile as ProviderProfileRow | null)?.sigi_tier);
    if (!hasSmart(currentTier)) {
      return NextResponse.json(
        { error: "Optional personal provider settings require Sigi Smart or Pro." },
        { status: 403 }
      );
    }

    const encryptedKey = body.apiKey
      ? encrypt(body.apiKey)
      : (profile as ProviderProfileRow | null)?.sigi_provider_api_key_encrypted ?? null;

    const { error } = await supabase
      .from("profiles")
      .update({
        sigi_provider_enabled: Boolean(body.enabled),
        sigi_provider_base_url: body.baseUrl ?? null,
        sigi_provider_model: body.model ?? null,
        sigi_provider_label: body.label ?? null,
        sigi_provider_api_key_encrypted: encryptedKey,
        sigi_provider_failure_count: 0,
        sigi_provider_last_error: null,
      })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to save Sigi settings.",
      },
      { status: 500 }
    );
  }
}