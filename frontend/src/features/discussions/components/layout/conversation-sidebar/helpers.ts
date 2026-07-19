import { Hash, Lock, Megaphone } from 'lucide-react'

export type Filter = 'all' | 'unread' | 'faculty' | 'clubs' | 'favorites'

export function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

export function channelIcon(kind: string, isPrivate?: boolean) {
  if (isPrivate) return Lock
  if (kind === 'ANNOUNCEMENT') return Megaphone
  return Hash
}
