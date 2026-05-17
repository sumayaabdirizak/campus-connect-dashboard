'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useUpdateMyDiscussionStatus } from '../../api/queries';

const PRESETS = [
  { emoji: '📚', label: 'Studying' },
  { emoji: '🎓', label: 'In class' },
  { emoji: '🤝', label: 'In a meeting' },
  { emoji: '☕', label: 'Be right back' },
  { emoji: '🌙', label: 'Do not disturb' }
] as const;

const MAX_LEN = 80;

/** True when the trimmed status would put the user in DND (matches the
 *  backend's isDoNotDisturbStatus exactly). */
function isDndStatus(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  return t === 'dnd' || t === 'do not disturb' || t.includes('do not disturb');
}

export function StatusSetterPopover({
  current,
  trigger
}: {
  current: string | null;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(current ?? '');
  const update = useUpdateMyDiscussionStatus();

  // Reset draft to the latest persisted value whenever the popover (re)opens
  // — guards against stale text if the user changed their mind without saving.
  useEffect(() => {
    if (open) setDraft(current ?? '');
  }, [open, current]);

  const trimmed = draft.trim();
  const willBeDnd = isDndStatus(trimmed);
  const isUnchanged = trimmed === (current ?? '').trim();

  const apply = (status: string | null) => {
    setOpen(false);
    update.mutate(status);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className='w-72 p-0'
        align='start'
        side='top'
        sideOffset={8}
      >
        <div className='border-b px-3 py-2'>
          <div className='text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
            Set your status
          </div>
        </div>

        <div className='p-2'>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
            placeholder='What’s happening?'
            className='h-8 text-xs'
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (!isUnchanged) apply(trimmed || null);
              }
              if (e.key === 'Escape') setOpen(false);
            }}
          />
          <div className='mt-1 flex items-center justify-between px-1 text-[10px] text-muted-foreground'>
            <span>
              {willBeDnd ? (
                <span className='font-medium text-red-600 dark:text-red-400'>
                  Marks you as Do Not Disturb
                </span>
              ) : (
                <>{draft.length}/{MAX_LEN}</>
              )}
            </span>
            <span>Enter to save</span>
          </div>
        </div>

        <div className='border-t px-1 py-1'>
          {PRESETS.map((preset) => {
            const isActive = trimmed.toLowerCase() === preset.label.toLowerCase();
            return (
              <button
                key={preset.label}
                type='button'
                onClick={() => apply(preset.label)}
                className={cn(
                  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors',
                  isActive ? 'bg-muted/70' : 'hover:bg-muted/50'
                )}
              >
                <span aria-hidden className='text-base leading-none'>
                  {preset.emoji}
                </span>
                <span className='flex-1'>{preset.label}</span>
                {isActive && <Icons.check className='h-3.5 w-3.5 text-primary' />}
              </button>
            );
          })}
        </div>

        {(current ?? '').trim().length > 0 && (
          <div className='border-t p-2'>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='h-7 w-full justify-start text-xs text-muted-foreground'
              onClick={() => apply(null)}
            >
              <Icons.close className='mr-1 h-3.5 w-3.5' />
              Clear status
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
