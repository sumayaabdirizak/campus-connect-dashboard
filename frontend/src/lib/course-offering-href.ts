/** Course offering URLs — prefer hard navigation to avoid Turbopack soft-nav 404s. */

export function courseOfferingPath(
  offeringId: string | number,
  query?: Record<string, string | number | undefined | null>
): string {
  const base = `/dashboard/courses/${encodeURIComponent(String(offeringId))}`;
  if (!query) return base;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value == null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Full page load — avoids Next soft-nav "Failed to fetch" / global 404 on course detail. */
export function navigateToCourseOffering(
  offeringId: string | number,
  query?: Record<string, string | number | undefined | null>
) {
  if (typeof window === 'undefined') return;
  window.location.assign(courseOfferingPath(offeringId, query));
}
