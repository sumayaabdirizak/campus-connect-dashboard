export const MIN_OTHER_MEMBERS = 2
export const MAX_OTHER_MEMBERS = 9

export function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}
