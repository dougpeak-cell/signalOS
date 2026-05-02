export function encodeReturnTo(value: string): string {
  return encodeURIComponent(value);
}

export function decodeReturnTo(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

export function buildReturnTo(pathname: string, search?: string): string {
  const safePath = pathname || "/";
  const safeSearch = search || "";
  return `${safePath}${safeSearch}`;
}

export function appendReturnTo(href: string, returnTo: string): string {
  if (!returnTo) return href;

  const joiner = href.includes("?") ? "&" : "?";
  return `${href}${joiner}returnTo=${encodeReturnTo(returnTo)}`;
}

export function isSafeInternalReturnTo(value: string): boolean {
  if (!value) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  return true;
}
