export const MIN_OTHER_MEMBERS = 2
/** Others only; total with you = 50 (backend MAX_TOTAL_MEMBERS). */
export const MAX_OTHER_MEMBERS = 49

export function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}
