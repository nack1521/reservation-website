function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

export function getApiBaseUrl() {
  const configured = trimTrailingSlash(import.meta.env.VITE_API_URL || "");

  if (configured) return configured;

  // In local dev, Vite proxy/same-origin calls can use relative paths.
  if (import.meta.env.DEV) return "";

  // In production without explicit API URL, fallback to same-origin.
  return trimTrailingSlash(window.location.origin);
}

export function getApiOrigin() {
  const base = getApiBaseUrl();
  if (!base) return window.location.origin;

  try {
    return new URL(base, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
}
