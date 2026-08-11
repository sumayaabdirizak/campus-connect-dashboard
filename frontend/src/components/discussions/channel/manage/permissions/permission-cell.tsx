'use client';

import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { CellState } from './bitmask';

const CELL_BUTTONS: Array<{
  state: CellState;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active: string;
  hover: string;
}> = [
  {
    state: 'deny',
    label: 'Deny',
    Icon: Icons.close,
    active: 'bg-destructive text-destructive-foreground',
    hover: 'hover:bg-destructive/10 hover:text-destructive'
  },
  {
    state: 'inherit',
    label: 'Inherit',
    Icon: Icons.minus,
    active: 'bg-muted text-foreground',
    hover: 'hover:bg-muted'
  },
  {
    state: 'allow',
    label: 'Allow',
    Icon: Icons.check,
    active: 'bg-emerald-500 text-white dark:bg-emerald-600',
    hover: 'hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400'
  }
];

interface PermissionCellProps {
  state: CellState;
  disabled: boolean;
  onChange: (next: CellState) => void;
}

export function PermissionCell({ state, disabled, onChange }: PermissionCellProps) {
  return (
    <div
      role='radiogroup'
      className='inline-flex items-center gap-0.5 rounded-md border bg-background p-0.5'
    >
      {CELL_BUTTONS.map((b) => {
        const selected = b.state === state;
        return (
          <button
            key={b.state}
            type='button'
            role='radio'
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(b.state)}
            className={cn(
              'flex h-6 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors',
              !selected && !disabled && b.hover,
              selected && b.active,
              disabled && 'cursor-not-allowed opacity-50'
            )}
            title={b.label}
            aria-label={b.label}
          >
            <b.Icon className='h-3.5 w-3.5' />
          </button>
        );
      })}
    </div>
  );
}
