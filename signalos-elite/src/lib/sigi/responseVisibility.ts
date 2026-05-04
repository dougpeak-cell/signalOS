function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

const HIDDEN_SIGI_RESPONSE_PATTERN =
  /sigi ai is not configured right now|openai_api_key|connect a hosted or personal provider|sigi temporarily offline/i;

export function shouldHideSigiUnavailablePayload(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const record = payload as Record<string, unknown>;
  const mode = readText(record.mode).toLowerCase();
  const combinedText = [record.title, record.summary, record.text]
    .map(readText)
    .filter(Boolean)
    .join(" ");

  return mode === "fallback" && HIDDEN_SIGI_RESPONSE_PATTERN.test(combinedText);
}

export function getVisibleSigiTextFromPayload(payload: unknown): string | null {
  if (shouldHideSigiUnavailablePayload(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const text = readText(record.text);
  return text || null;
}