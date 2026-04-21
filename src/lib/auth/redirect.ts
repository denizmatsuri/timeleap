const DEFAULT_NEXT_PATH = "/onboarding";

export function normalizeNextPath(
  value: FormDataEntryValue | string | string[] | null | undefined,
  fallback = DEFAULT_NEXT_PATH,
) {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (typeof candidate !== "string") {
    return fallback;
  }

  const normalized = candidate.trim();

  if (
    normalized.length === 0 ||
    !normalized.startsWith("/") ||
    normalized.startsWith("//") ||
    normalized.startsWith("/auth/callback")
  ) {
    return fallback;
  }

  return normalized;
}

export function createLoginRedirectPath(nextPath: string) {
  const url = new URLSearchParams({
    next: normalizeNextPath(nextPath),
  });

  return `/login?${url.toString()}`;
}
