const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** @param {unknown} value */
export function isUuidShaped(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Every messaging model (GroupDm, DiscussionGroup, DiscussionChannel,
 * DiscussionChannelCategory, DiscussionMessage, DiscussionAttachment) has
 * the same `{ id: Int, publicId: Uuid }` shape — this resolves a route
 * param or socket payload value to a Prisma `where` clause, accepting
 * either the new UUID `publicId` or a legacy numeric `id` (mirrors
 * `courseOfferingWhereFromParam` in utils/courseOfferingAccess.js).
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
