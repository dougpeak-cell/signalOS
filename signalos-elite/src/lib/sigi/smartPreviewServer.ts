import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";

export const SMART_PREVIEW_DURATION_MS = 10 * 60 * 1000;
export const SMART_PREVIEW_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export type SmartPreviewStatus = {
  active: boolean;
  eligible: boolean;
  isSignedIn: boolean;
  startedAt: number | null;
  expiresAt: number | null;
  nextEligibleAt: number | null;
};

function toTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function buildStatus(isSignedIn: boolean, startedAt: number | null): SmartPreviewStatus {
  const now = Date.now();
  const expiresAt = startedAt === null ? null : startedAt + SMART_PREVIEW_DURATION_MS;
  const nextEligibleAt = startedAt === null ? null : startedAt + SMART_PREVIEW_COOLDOWN_MS;

  return {
    active: expiresAt !== null && now < expiresAt,
    eligible: isSignedIn && (nextEligibleAt === null || now >= nextEligibleAt),
    isSignedIn,
    startedAt,
    expiresAt,
    nextEligibleAt,
  };
}

export async function getSmartPreviewStatusForCurrentUser(): Promise<SmartPreviewStatus> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return buildStatus(false, null);

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("smart_preview_started_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;

  return buildStatus(true, toTimestamp(data?.smart_preview_started_at));
}

export async function hasActiveSmartPreviewForCurrentUser(): Promise<boolean> {
  try {
    return (await getSmartPreviewStatusForCurrentUser()).active;
  } catch (error) {
    console.error("Unable to resolve Smart preview access", error);
    return false;
  }
}

export async function startSmartPreviewForCurrentUser(): Promise<SmartPreviewStatus> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return buildStatus(false, null);

  const currentStatus = await getSmartPreviewStatusForCurrentUser();
  if (!currentStatus.eligible) return currentStatus;

  const startedAt = Date.now();
  const cutoff = new Date(startedAt - SMART_PREVIEW_COOLDOWN_MS).toISOString();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ smart_preview_started_at: new Date(startedAt).toISOString() })
    .eq("user_id", user.id)
    .or(`smart_preview_started_at.is.null,smart_preview_started_at.lt.${cutoff}`)
    .select("smart_preview_started_at")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    const latestStatus = await getSmartPreviewStatusForCurrentUser();
    if (latestStatus.startedAt !== null) return latestStatus;

    const { data: inserted, error: insertError } = await admin
      .from("profiles")
      .upsert(
        { user_id: user.id, smart_preview_started_at: new Date(startedAt).toISOString() },
        { onConflict: "user_id" },
      )
      .select("smart_preview_started_at")
      .single();

    if (insertError) throw insertError;
    return buildStatus(true, toTimestamp(inserted.smart_preview_started_at));
  }

  return buildStatus(true, toTimestamp(data.smart_preview_started_at));
}
