import { cn } from '@/lib/utils';
import { avatarGradient } from '@/features/discussions/utils/avatar-color';
import type { InboxRow } from '../api/inbox-types';
import { fmtWhen, initialsOf, TYPE_META } from './inbox-helpers';

export function InboxRowItem({ row, onOpen, isActive }: { row: InboxRow; onOpen: (href: string) => void; isActive?: boolean }) {
  const TypeIcon = TYPE_META[row.type].icon;
  return (
    <button
      type='button'
      onClick={() => onOpen(row.href)}
      className={cn(
        'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
        isActive ? 'bg-primary/10' : 'hover:bg-muted/50'
      )}
    >
      <div className='relative shrink-0'>
        {row.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.avatarUrl} alt='' className='size-12 rounded-full object-cover' />
        ) : (
          <span
            className='flex size-12 items-center justify-center rounded-full text-sm font-bold text-white'
            style={{ background: avatarGradient(row.title) }}
          >
            {initialsOf(row.title)}
          </span>
        )}
        <span className='absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-card ring-1 ring-border'>
          <TypeIcon className='size-2.5 text-muted-foreground' aria-hidden />
        </span>
      </div>
      <div className='min-w-0 flex-1'>
        <div className='flex items-baseline justify-between gap-2'>
          <p className={cn('truncate text-sm', row.unreadCount > 0 ? 'font-semibold' : 'font-medium')}>
            {row.title}
          </p>
          <span className='shrink-0 text-[11px] tabular-nums text-muted-foreground'>
            {fmtWhen(row.timestamp)}
          </span>
        </div>
        <div className='mt-0.5 flex items-center justify-between gap-2'>
          <p className='truncate text-xs text-muted-foreground'>{row.preview || row.subtitle || ''}</p>
          {row.unreadCount > 0 && (
            <span className='inline-flex min-w-[20px] shrink-0 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-primary-foreground'>
              {row.unreadCount > 99 ? '99+' : row.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
