export type SigiTier = "free" | "smart" | "pro";

export type SigiGateFeature =
  | "memory"
  | "personalization"
  | "research"
  | "proactive"
  | "automation";

export function normalizeSigiTier(value: string | null | undefined): SigiTier {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "smart" || normalized === "pro") return normalized;
  return "free";
}

export function hasSmart(tier: SigiTier): boolean {
  return tier === "smart" || tier === "pro";
}

export function hasPro(tier: SigiTier): boolean {
  return tier === "pro";
}

export function gate(feature: SigiGateFeature | string, tier: SigiTier): boolean {
  switch (feature) {
    case "memory":
      return hasSmart(tier);

    case "personalization":
      return hasSmart(tier);

    case "research":
      return hasPro(tier);

    case "proactive":
      return hasPro(tier);

    case "automation":
      return hasPro(tier);

    default:
      return true;
  }
}