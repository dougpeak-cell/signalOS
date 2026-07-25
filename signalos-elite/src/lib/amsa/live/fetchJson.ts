/* =========================================================
   AMSA INTERNAL FETCH UTILITIES

   Provides:
   - timeout protection
   - safe JSON parsing
   - optional request headers
   - readable error messages
========================================================= */

export type FetchJsonOptions = {
  timeoutMs?: number;

  headers?: HeadersInit;

  cache?: RequestCache;

  next?: {
    revalidate?: number;
    tags?: string[];
  };
};

export type FetchJsonResult<T> = {
  ok: boolean;

  status: number;

  data: T | null;

  error: string | null;

  durationMs: number;
};

export async function fetchJson<T>(
  url: string,
  options: FetchJsonOptions = {},
): Promise<FetchJsonResult<T>> {
  const startedAt =
    performance.now();

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? 8_000,
    );

  try {
    const response =
      await fetch(url, {
        method: "GET",

        headers:
          options.headers,

        cache:
          options.cache,

        next:
          options.next,

        signal:
          controller.signal,
      });

    const durationMs =
      Math.round(
        performance.now() -
          startedAt,
      );

    let payload:
      | T
      | null = null;

    try {
      payload =
        (await response.json()) as T;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      return {
        ok: false,

        status:
          response.status,

        data: payload,

        error:
          extractError(payload) ??
          `Request failed with status ${response.status}.`,

        durationMs,
      };
    }

    return {
      ok: true,

      status:
        response.status,

      data:
        payload,

      error: null,

      durationMs,
    };
  } catch (error) {
    const durationMs =
      Math.round(
        performance.now() -
          startedAt,
      );

    return {
      ok: false,
      status: 0,
      data: null,

      error:
        error instanceof Error
          ? error.name ===
            "AbortError"
            ? "Request timed out."
            : error.message
          : "Request failed.",

      durationMs,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function extractError(
  value: unknown,
): string | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const object =
    value as Record<
      string,
      unknown
    >;

  for (const key of [
    "error",
    "message",
    "detail",
  ]) {
    const candidate =
      object[key];

    if (
      typeof candidate ===
      "string"
    ) {
      return candidate;
    }
  }

  return null;
}