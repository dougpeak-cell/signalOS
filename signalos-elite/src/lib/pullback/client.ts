export function pullbackPreviewHeaders(): Record<string, string> {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return {};
  const tier = new URLSearchParams(window.location.search).get("previewPlan");
  return tier && ["free", "smart", "pro"].includes(tier) ? { "x-signalos-preview-plan": tier } : {};
}
