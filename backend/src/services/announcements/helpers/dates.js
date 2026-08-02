/** @param {unknown} value */
export function normalizePublishedAt(value) {
  if (value == null || value === "") return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

/** @param {unknown} value */
export function normalizeExpiresAt(value) {
  return normalizePublishedAt(value);
}

/** @param {unknown} p */
export function toPrismaPriority(p) {
  const u = String(p ?? "normal").toUpperCase();
  if (u === "IMPORTANT") return "IMPORTANT";
  if (u === "URGENT") return "URGENT";
  return "NORMAL";
}

/** @param {{ publishedAt?: string | null; status?: string }} parsed */
export function deriveInitialStatus(parsed) {
  if (parsed.status === "DRAFT") return "DRAFT";
  return "PUBLISHED";
}
