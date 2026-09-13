import type { DiscussionRole } from '@/lib/discussions/queries/types';

export const PAGE_SIZE = 50;

export const ROLE_PILL: Record<DiscussionRole, string> = {
  OWNER: 'bg-[#EFF6FF] text-[#2563EB]',
  ADMIN: 'bg-[#FEF3C7] text-[#B45309]',
  MODERATOR: 'bg-[#F1F5F9] text-[#475569]',
  MEMBER: 'bg-[#F8FAFC] text-[#667085]'
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
