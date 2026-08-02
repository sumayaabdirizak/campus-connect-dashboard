import { DISCUSSION_SCOPE_TYPES } from "../policy.js";
import { CATEGORY_KEYS } from "./constants.js";

export function slugify(input, fallbackPrefix = "channel", suffix) {
  const base = String(input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9-_\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const safe = base || fallbackPrefix;
  return suffix ? `${safe}-${suffix}` : safe;
}

export function categoryKeyForScope(scopeType) {
  switch (scopeType) {
    case DISCUSSION_SCOPE_TYPES.DEPARTMENT:
      return CATEGORY_KEYS.DEPARTMENTS;
    case DISCUSSION_SCOPE_TYPES.BATCH:
      return CATEGORY_KEYS.BATCHES;
    case DISCUSSION_SCOPE_TYPES.SECTION:
      return CATEGORY_KEYS.SECTIONS;
    default:
      return null;
  }
}

export function channelNameForScope(scopeType, scopeName, scopeId) {
  const safeName = String(scopeName || "").trim() || `${scopeType}-${scopeId}`;
  switch (scopeType) {
    case DISCUSSION_SCOPE_TYPES.DEPARTMENT:
      return `dept-${slugify(safeName, "dept")}`;
    case DISCUSSION_SCOPE_TYPES.BATCH:
      return `batch-${slugify(safeName, "batch")}`;
    case DISCUSSION_SCOPE_TYPES.SECTION:
      return `sec-${slugify(safeName, "sec")}`;
    default:
      return slugify(safeName, "channel");
  }
}
