/** True when a Messages URL id is a guessable sequential integer. */
export function isLegacyNumericDiscussionId(
  id: string | number | null | undefined
): boolean {
  if (id == null) return false
  const s = String(id).trim()
  return /^\d+$/.test(s)
}
