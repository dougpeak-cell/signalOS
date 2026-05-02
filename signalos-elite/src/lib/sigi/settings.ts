import { cache } from "react";
import { gate, hasPro, hasSmart, normalizeSigiTier, type SigiTier } from "@/lib/sigi/gates";
import { decrypt, encrypt, isEncryptionReady } from "@/lib/security/encryption";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getNextSigiTier,
  getSigiTierCard,
} from "@/lib/sigi/plans";

const DEFAULT_SIGI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_SIGI_MODEL = "gpt-4.1-mini";
const ALLOWED_MODELS = new Set([
  "gpt-4.1-mini",
  "gpt-4.1",
  "gpt-4o-mini",
  "gpt-4o",
  "o4-mini",
]);
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 12;
const MAX_PROVIDER_ERROR_LENGTH = 1000;

function formatBillingDate(value: string | null | undefined): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
  }).format(date);
}

export function getDefaultModelByTier(tier: SigiTier): string {
  if (hasPro(tier)) return "gpt-4.1";
  if (hasSmart(tier)) return "gpt-4.1-mini";
  return "gpt-4o-mini";
}

export type StoredSigiSettingsRow = {
  user_id: string;
  provider: string;
  base_url: string;
  model: string;
  plan_tier?: string | null;
  encrypted_api_key: string | null;
  is_enabled: boolean;
  paid_access_enabled: boolean;
  request_limit_per_minute: number | null;
  updated_at?: string | null;
};

type StoredProfileRow = {
  id: string;
  sigi_tier?: string | null;
  sigi_provider_enabled?: boolean | null;
  sigi_provider_base_url?: string | null;
  sigi_provider_model?: string | null;
  sigi_provider_label?: string | null;
  sigi_provider_api_key_encrypted?: string | null;
  sigi_usage_count?: number | null;
  sigi_last_used_at?: string | null;
  stripe_subscription_status?: string | null;
  stripe_price_id?: string | null;
  stripe_current_period_end?: string | null;
  stripe_cancel_at_period_end?: boolean | null;
  billing_status?: string | null;
};

export type SigiBillingStatus = "active" | "payment_issue" | "canceling";

type BillingUI = {
  status: "Active" | "Payment issue" | "Ends soon";
  cta: "Manage billing" | "Fix billing" | "Resume plan";
};

export type SigiUserSettingsView = {
  isSignedIn: boolean;
  canManage: boolean;
  paidAccessEnabled: boolean;
  currentTier: SigiTier;
  nextTier: SigiTier | null;
  encryptionReady: boolean;
  hostedAiAvailable: boolean;
  hostedAiStatus: string;
  hostedAiSubtext: string;
  usingOwnProvider: boolean;
  provider: string;
  baseUrl: string;
  model: string;
  apiKeyConfigured: boolean;
  isEnabled: boolean;
  allowedModels: string[];
  requestLimitPerMinute: number;
  hasSmartFeatures: boolean;
  hasProFeatures: boolean;
  billingStatus: SigiBillingStatus;
  billingStatusLabel: BillingUI["status"];
  billingCtaLabel: BillingUI["cta"];
  billingPeriodEndLabel: string | null;
  canManageBilling: boolean;
  message: string | null;
};

export type SigiResolvedModelConfig = {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  requestLimitPerMinute: number;
  source: "user" | "env";
};

export type SigiRequestGuard = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  source: "user" | "env" | "none";
};

type AuthContext = {
  userId: string | null;
};

export type SigiPersonalProviderFailureState = {
  failureCount: number;
  autoDisabled: boolean;
};

function normalizeBaseUrl(value: string | null | undefined): string {
  const baseUrl = String(value ?? "").trim() || DEFAULT_SIGI_BASE_URL;
  return baseUrl.replace(/\/$/, "");
}

function normalizeModel(value: string | null | undefined): string {
  const model = String(value ?? "").trim() || DEFAULT_SIGI_MODEL;
  return ALLOWED_MODELS.has(model) ? model : DEFAULT_SIGI_MODEL;
}

async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    userId: user?.id ?? null,
  };
}

async function getUserSettingsRow(userId: string): Promise<StoredSigiSettingsRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("sigi_user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load Sigi settings", error);
    return null;
  }

  return (data as StoredSigiSettingsRow | null) ?? null;
}

const getUserProfileRowCached = cache(async (userId: string): Promise<StoredProfileRow | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, sigi_tier, sigi_provider_enabled, sigi_provider_base_url, sigi_provider_model, sigi_provider_label, sigi_provider_api_key_encrypted, sigi_usage_count, sigi_last_used_at, stripe_subscription_status, stripe_price_id, stripe_current_period_end, stripe_cancel_at_period_end, billing_status"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load Sigi profile", error);
    return null;
  }

  return (data as StoredProfileRow | null) ?? null;
});

function resolveCurrentTier(
  profile: StoredProfileRow | null,
  _row: StoredSigiSettingsRow | null
): SigiTier {
  return normalizeSigiTier(profile?.sigi_tier);
}

function buildEnvConfig(): SigiResolvedModelConfig | null {
  const apiKey = process.env.SIGI_API_KEY ?? process.env.OPENAI_API_KEY ?? null;
  if (!apiKey) return null;

  return {
    provider: process.env.SIGI_PROVIDER ?? "openai-compatible",
    baseUrl: normalizeBaseUrl(process.env.SIGI_BASE_URL ?? process.env.OPENAI_BASE_URL),
    apiKey,
    model: normalizeModel(process.env.SIGI_MODEL ?? process.env.OPENAI_MODEL),
    requestLimitPerMinute: RATE_LIMIT_MAX_REQUESTS,
    source: "env",
  };
}

export function getHostedSigiModelConfig(): SigiResolvedModelConfig | null {
  return buildEnvConfig();
}

function shouldUseCustomProvider(
  tier: SigiTier,
  row: StoredSigiSettingsRow | null,
  profile: StoredProfileRow | null
): boolean {
  if (!hasSmart(tier)) return false;

  if (profile?.sigi_provider_enabled && profile?.sigi_provider_api_key_encrypted) {
    return true;
  }

  return Boolean(row?.is_enabled && row?.encrypted_api_key);
}

function resolveBillingStatus(profile: StoredProfileRow | null, tier: SigiTier): SigiBillingStatus {
  if (profile?.billing_status === "past_due") return "payment_issue";
  if (hasSmart(tier) && profile?.stripe_cancel_at_period_end) return "canceling";
  return "active";
}

function getBillingUI(profile: StoredProfileRow | null): BillingUI | null {
  if (!profile) return null;

  if (profile.billing_status === "past_due") {
    return {
      status: "Payment issue",
      cta: "Fix billing",
    };
  }

  if (profile.stripe_subscription_status === "canceled" || profile.stripe_cancel_at_period_end) {
    return {
      status: "Ends soon",
      cta: "Resume plan",
    };
  }

  return {
    status: "Active",
    cta: "Manage billing",
  };
}

function toViewModel(
  row: StoredSigiSettingsRow | null,
  profile: StoredProfileRow | null,
  userId: string | null
): SigiUserSettingsView {
  const encryptionReady = isEncryptionReady();
  const isSignedIn = Boolean(userId);
  const currentTier = resolveCurrentTier(profile, row);
  const paidAccessEnabled = hasSmart(currentTier);
  const hostedConfig = buildEnvConfig();
  const hostedAiAvailable = hostedConfig != null;
  const usingOwnProvider = shouldUseCustomProvider(currentTier, row, profile);
  const canManage = isSignedIn && hasSmart(currentTier);
  const billingStatus = resolveBillingStatus(profile, currentTier);
  const billingUI = getBillingUI(profile);
  const tierCard = getSigiTierCard(currentTier);
  const provider = profile?.sigi_provider_label ?? row?.provider ?? "openai-compatible";
  const baseUrl = profile?.sigi_provider_base_url ?? row?.base_url ?? DEFAULT_SIGI_BASE_URL;
  const model = normalizeModel(profile?.sigi_provider_model ?? row?.model);
  const apiKeyConfigured = Boolean(
    profile?.sigi_provider_api_key_encrypted ?? row?.encrypted_api_key
  );
  const isEnabled = Boolean(profile?.sigi_provider_enabled ?? row?.is_enabled ?? false);

  let message: string | null = null;
  if (!isSignedIn) {
    message = "Sigi AI works instantly with your plan. Sign in only if you want Advanced AI Settings or your own provider.";
  } else if (!hasSmart(currentTier)) {
    message = "Sigi AI is already active. Smart unlocks more personal help, and Pro unlocks deeper research, proactive prompts, and action tools.";
  } else if (!encryptionReady && isSignedIn) {
    message = "Hosted Sigi AI stays active. SIGI_SETTINGS_ENCRYPTION_KEY is only needed if you want to store your own provider key in Advanced AI Settings.";
  }

  return {
    isSignedIn,
    canManage: canManage && encryptionReady,
    paidAccessEnabled,
    currentTier,
    nextTier: getNextSigiTier(currentTier),
    encryptionReady,
    hostedAiAvailable,
    hostedAiStatus: hostedAiAvailable ? "Sigi AI Active" : "Sigi AI Standby",
    hostedAiSubtext: hostedAiAvailable
      ? `Powered by your plan (${tierCard.name}).`
      : `Hosted Sigi AI is not configured yet. ${tierCard.name} still controls the in-app experience and gating.`,
    usingOwnProvider,
    provider,
    baseUrl,
    model,
    apiKeyConfigured,
    isEnabled,
    allowedModels: Array.from(ALLOWED_MODELS),
    requestLimitPerMinute: Math.max(1, row?.request_limit_per_minute ?? RATE_LIMIT_MAX_REQUESTS),
    hasSmartFeatures: gate("personalization", currentTier),
    hasProFeatures: gate("research", currentTier),
    billingStatus,
    billingStatusLabel: billingUI?.status ?? "Active",
    billingCtaLabel: billingUI?.cta ?? "Manage billing",
    billingPeriodEndLabel: formatBillingDate(profile?.stripe_current_period_end),
    canManageBilling: Boolean(isSignedIn && profile?.stripe_subscription_status),
    message,
  };
}

export async function getSigiSettingsViewForCurrentUser(): Promise<SigiUserSettingsView> {
  const auth = await getAuthContext();
  if (!auth.userId) {
    return toViewModel(null, null, null);
  }

  const [row, profile] = await Promise.all([
    getUserSettingsRow(auth.userId),
    getUserProfileRowCached(auth.userId),
  ]);
  return toViewModel(row, profile, auth.userId);
}

export async function getResolvedSigiModelConfigForCurrentUser(): Promise<SigiResolvedModelConfig | null> {
  const auth = await getAuthContext();
  if (auth.userId) {
    const [row, profile] = await Promise.all([
      getUserSettingsRow(auth.userId),
      getUserProfileRowCached(auth.userId),
    ]);
    const currentTier = resolveCurrentTier(profile, row);
    const useBYOK = shouldUseCustomProvider(currentTier, row, profile);
    const encryptedApiKey = profile?.sigi_provider_api_key_encrypted ?? row?.encrypted_api_key;
    if (useBYOK && encryptedApiKey) {
      const apiKey = decrypt(encryptedApiKey);
      if (apiKey) {
        return {
          provider: profile?.sigi_provider_label || row?.provider || "openai-compatible",
          baseUrl: normalizeBaseUrl(profile?.sigi_provider_base_url ?? row?.base_url),
          apiKey,
          model: normalizeModel(profile?.sigi_provider_model ?? row?.model),
          requestLimitPerMinute: Math.max(1, row?.request_limit_per_minute ?? RATE_LIMIT_MAX_REQUESTS),
          source: "user",
        };
      }
    }
  }

  return buildEnvConfig();
}

export async function resetSigiPersonalProviderFailureStateForCurrentUser(): Promise<void> {
  const auth = await getAuthContext();
  if (!auth.userId) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      sigi_provider_failure_count: 0,
      sigi_provider_last_error: null,
    })
    .eq("id", auth.userId);

  if (error) {
    console.error("Failed to reset Sigi personal provider health", error);
  }
}

export async function recordSigiPersonalProviderFailureForCurrentUser(
  errorMessage: string
): Promise<SigiPersonalProviderFailureState> {
  const auth = await getAuthContext();
  if (!auth.userId) {
    return { failureCount: 0, autoDisabled: false };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error: profileError } = await supabase
    .from("profiles")
    .select("sigi_provider_failure_count")
    .eq("id", auth.userId)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to load Sigi personal provider health", profileError);
    return { failureCount: 0, autoDisabled: false };
  }

  const currentCount = Math.max(
    0,
    Number((data as { sigi_provider_failure_count?: number | null } | null)?.sigi_provider_failure_count ?? 0)
  );
  const failureCount = currentCount + 1;
  const autoDisabled = failureCount >= 3;
  const trimmedError = errorMessage.slice(0, MAX_PROVIDER_ERROR_LENGTH);
  const updatePayload: {
    sigi_provider_failure_count: number;
    sigi_provider_last_error: string;
    sigi_provider_enabled?: boolean;
  } = {
    sigi_provider_failure_count: failureCount,
    sigi_provider_last_error: trimmedError,
  };

  if (autoDisabled) {
    updatePayload.sigi_provider_enabled = false;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", auth.userId);

  if (error) {
    console.error("Failed to update Sigi personal provider health", error);
  }

  return { failureCount, autoDisabled };
}

export async function guardSigiRequestForCurrentUser(): Promise<SigiRequestGuard> {
  const auth = await getAuthContext();
  const config = await getResolvedSigiModelConfigForCurrentUser();
  if (!config) {
    return {
      allowed: true,
      limit: 0,
      remaining: 0,
      retryAfterSeconds: 0,
      source: "none",
    };
  }

  if (!auth.userId) {
    return {
      allowed: config.source === "env",
      limit: config.requestLimitPerMinute,
      remaining: config.requestLimitPerMinute,
      retryAfterSeconds: 0,
      source: config.source,
    };
  }

  const supabase = await createSupabaseServerClient();
  const threshold = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count, error } = await supabase
    .from("sigi_usage_events")
    .select("user_id", { count: "exact", head: true })
    .eq("user_id", auth.userId)
    .gte("created_at", threshold);

  if (error) {
    console.error("Failed to read Sigi usage events", error);
    return {
      allowed: true,
      limit: config.requestLimitPerMinute,
      remaining: config.requestLimitPerMinute,
      retryAfterSeconds: 0,
      source: config.source,
    };
  }

  const used = count ?? 0;
  const remaining = Math.max(0, config.requestLimitPerMinute - used);
  const allowed = remaining > 0;

  if (allowed) {
    const { error: insertError } = await supabase.from("sigi_usage_events").insert({
      user_id: auth.userId,
      source: config.source,
    });

    if (insertError) {
      console.error("Failed to write Sigi usage event", insertError);
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        sigi_usage_count: used + 1,
        sigi_last_used_at: new Date().toISOString(),
      })
      .eq("id", auth.userId);

    if (profileError) {
      console.error("Failed to update Sigi profile usage", profileError);
    }
  }

  return {
    allowed,
    limit: config.requestLimitPerMinute,
    remaining: allowed ? remaining - 1 : 0,
    retryAfterSeconds: allowed ? 0 : Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
    source: config.source,
  };
}

export async function getSigiPlanSummaryForCurrentUser() {
  const view = await getSigiSettingsViewForCurrentUser();

  return {
    currentTier: view.currentTier,
    nextTier: view.nextTier,
    hasSmartFeatures: view.hasSmartFeatures,
    hasProFeatures: view.hasProFeatures,
    isSignedIn: view.isSignedIn,
  };
}