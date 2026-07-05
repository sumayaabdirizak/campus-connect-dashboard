/** Discord-style channel slug from a display name. */
export function slugifyDiscussionChannelName(name) {
  const base = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return base || `channel-${Date.now().toString(36)}`;
}
