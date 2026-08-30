import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** A pinned system feed row (Broadcasts / Updates) — no avatar, not a person. */
export function InboxSystemRow({
  icon: Icon,
  tint,
  title,
  preview,
  when,
  unread,
  onOpen
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  tint: string;
  title: string;
  preview: string;
  when: string;
  unread: number;
  onOpen: () => void;
}) {
  return (
    <button
      type='button'
      onClick={onOpen}
      className='flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
    >
      <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl', tint)}>
        <Icon className='size-5' aria-hidden />
      </span>
      <div className='min-w-0 flex-1'>
        <div className='flex items-baseline justify-between gap-2'>
          <p className={cn('truncate text-sm', unread > 0 ? 'font-semibold' : 'font-medium')}>{title}</p>
          <span className='shrink-0 text-[11px] tabular-nums text-muted-foreground'>{when}</span>
        </div>
        <div className='mt-0.5 flex items-center justify-between gap-2'>
          <p className='truncate text-xs text-muted-foreground'>{preview}</p>
          {unread > 0 && (
            <span className='inline-flex min-w-[20px] shrink-0 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-primary-foreground'>
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className='size-4 shrink-0 text-muted-foreground/50' aria-hidden />
    </button>
  );
}
