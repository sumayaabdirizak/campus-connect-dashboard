const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** @param {unknown} value */
export function isUuidShaped(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Public channel / server / category identifiers — UUID only.
 * Rejects guessable sequential ints so `?channel=2` cannot probe resources.
 * @param {unknown} identifier
 * @returns {{ publicId: string } | null}
 */
export function whereFromPublicId(identifier) {
  if (!isUuidShaped(identifier)) return null;
  return { publicId: String(identifier) };
}

/**
 * Message / attachment identifiers — prefers UUID; still accepts legacy
 * numeric ids for older clients during migration.
 * @param {unknown} identifier
 */
export function whereFromParam(identifier) {
  if (isUuidShaped(identifier)) {
    return { publicId: identifier };
  }
  const id = Number(identifier);
  if (Number.isFinite(id) && id > 0) {
    return { id };
  }
  return null;
}
