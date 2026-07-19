export const STUDENT_STEPS = ['Identity', 'Scope & Rules', 'Review'] as const
export const DEAN_STEPS = ['Identity', 'Scope & Rules', 'Moderators', 'Review'] as const

export const THEME_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6b7280',
  '#1e293b',
]

export function deriveSlug(n: string) {
  return n
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32)
}
