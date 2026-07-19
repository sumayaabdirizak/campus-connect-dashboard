import type { Badge } from '@/components/ui/badge';
import type { DiscussionRole } from '@/features/discussions/api/types';

export const PAGE_SIZE = 50;

export const MUTE_PRESETS: { label: string; minutes: number }[] = [
  { label: '15 minutes', minutes: 15 },
  { label: '1 hour', minutes: 60 },
  { label: '24 hours', minutes: 60 * 24 },
  { label: '7 days', minutes: 60 * 24 * 7 }
];

export const ROLE_BADGE_VARIANT: Record<
  DiscussionRole,
  React.ComponentProps<typeof Badge>['variant']
> = {
  OWNER: 'default',
  ADMIN: 'default',
  MODERATOR: 'secondary',
  MEMBER: 'outline'
};

export const ROLE_LABEL: Record<DiscussionRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MODERATOR: 'Mod',
  MEMBER: 'Member'
};

export function initialsFor(name: string | null | undefined): string {
  const source = name?.trim() ?? '';
  if (!source) return '?';
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function formatJoinedAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(d);
  } catch {
    return '';
  }
}

export function isoFromMinutesFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export function isoFromLocalInputValue(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function localInputMinValue(): string {
  const d = new Date(Date.now() + 60_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
