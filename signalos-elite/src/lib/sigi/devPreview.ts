import { cookies } from "next/headers";
import type { SigiTier } from "@/lib/sigi/gates";

export const DEV_PREVIEW_PLAN_COOKIE = "signalos-dev-preview-plan";

function normalizeDevPreviewTier(value: string | null | undefined): SigiTier | null {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();

  if (normalized === "free" || normalized === "smart" || normalized === "pro") {
    return normalized;
  }

  return null;
}

export async function getDevPreviewTier(): Promise<SigiTier | null> {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const cookieStore = await cookies();
  return normalizeDevPreviewTier(cookieStore.get(DEV_PREVIEW_PLAN_COOKIE)?.value);
}
