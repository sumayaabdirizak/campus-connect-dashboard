export function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

export function dmDisplayName(
  detail: {
    name?: string | null
    members: Array<{ userId?: number; user: { full_name: string } | null }>
  } | null,
  myUserId: number | null
): string {
  if (!detail) return ''
  if (detail.name && detail.name.trim().length > 0) return detail.name.trim()
  const others = detail.members
    .filter((m) => Number(m.userId) !== myUserId)
    .map((m) => m.user?.full_name)
    .filter((n): n is string => typeof n === 'string' && n.length > 0)
  if (others.length === 0) return 'Direct message'
  return others.slice(0, 3).join(', ') + (others.length > 3 ? ` +${others.length - 3}` : '')
}
