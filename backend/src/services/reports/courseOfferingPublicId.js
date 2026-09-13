/** UUID string as stored on CourseOffering.publicId (@db.Uuid). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Course report subjects must be offering publicIds (UUIDs), never numeric
 * user/teacher ids — Prisma throws "invalid length" on @db.Uuid otherwise.
 */
export function isCourseOfferingPublicId(raw) {
  return typeof raw === 'string' && UUID_RE.test(raw.trim());
}
