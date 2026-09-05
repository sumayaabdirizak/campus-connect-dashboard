'use client';

import { cn } from '@/lib/utils';

export type NewMessageRoleChip = 'ALL' | 'TEACHER' | 'STUDENT';

const DEAN_CHIPS: { key: NewMessageRoleChip; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'TEACHER', label: 'Teachers' },
  { key: 'STUDENT', label: 'Students' },
];

export function NewMessageRoleChips({
  value,
  onChange
}: {
  value: NewMessageRoleChip;
  onChange: (next: NewMessageRoleChip) => void;
}) {
  return (
    <div className='flex flex-wrap gap-1.5' role='tablist' aria-label='Filter by role'>
      {DEAN_CHIPS.map((chip) => {
        const on = value === chip.key;
        return (
          <button
            key={chip.key}
            type='button'
            role='tab'
            aria-selected={on}
            onClick={() => onChange(chip.key)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              on
                ? 'border-primary bg-primary/10 text-[#1D4ED8]'
                : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
            )}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}

export function matchesNewMessageRoleChip(
  role: string | null | undefined,
  chip: NewMessageRoleChip
): boolean {
  if (chip === 'ALL') return true;
  const r = String(role || '').toUpperCase();
  if (chip === 'TEACHER') return r === 'TEACHER' || r === 'LECTURER';
  return r === chip;
}
