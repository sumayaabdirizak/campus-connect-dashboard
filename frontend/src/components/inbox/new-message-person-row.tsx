'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { avatarGradient } from '@/lib/discussions/services/avatar-color';
import type { GroupDmCandidate } from '@/lib/discussions/queries/types';
import {
  candidateDisplayName,
  roleLabel
} from '@/components/discussions/dms/dm-create/candidate-hierarchy';

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

function subtitleFor(c: GroupDmCandidate): string {
  const role = roleLabel(c.role);
  const dept = c.departmentName?.trim() || c.departmentCode?.trim() || '';
  const section = c.sectionName?.trim() || '';
  const bits = [role, dept || section].filter(Boolean);
  if (bits.length > 0) return bits.join(' · ');
  return c.email?.trim() || '';
}

export function NewMessagePersonRow({
  candidate,
  pending,
  disabled,
  onPick
}: {
  candidate: GroupDmCandidate;
  pending: boolean;
  disabled: boolean;
  onPick: (userId: number) => void;
}) {
  const name = candidateDisplayName(candidate);
  const sub = subtitleFor(candidate);

  return (
    <button
      type='button'
      disabled={disabled}
      onClick={() => onPick(candidate.id)}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors',
        'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
        'disabled:opacity-60'
      )}
    >
      <span
        className='flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white'
        style={{ background: avatarGradient(name) }}
      >
        {initialsOf(name)}
      </span>
      <div className='min-w-0 flex-1'>
        <p className='truncate text-sm font-medium'>{name}</p>
        {sub ? (
          <p className='truncate text-xs text-muted-foreground'>{sub}</p>
        ) : null}
      </div>
      {pending ? (
        <Loader2 className='size-4 shrink-0 animate-spin text-muted-foreground' />
      ) : null}
    </button>
  );
}
