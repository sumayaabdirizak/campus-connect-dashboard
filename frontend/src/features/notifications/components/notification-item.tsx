'use client';

import Link from 'next/link';
import { Megaphone, FileText, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NotifItem, NotifType } from '../utils/use-notification-feed';

const ICON: Record<NotifType, typeof Megaphone> = {
  announcement: Megaphone,
  assignment: FileText,
  quiz: ClipboardCheck
};
const TONE: Record<NotifType, string> = {
  announcement: 'bg-primary/10 text-primary',
  assignment: 'bg-info-muted text-info',
  quiz: 'bg-success-muted text-success'
};

/** A single notification row — typed icon badge + title + subtitle + new dot. */
export function NotificationItem({ item, onNavigate }: { item: NotifItem; onNavigate?: () => void }) {
  const Icon = ICON[item.type];
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className='flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
    >
      <span className={cn('mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full', TONE[item.type])}>
        <Icon className='size-4' />
      </span>
      <div className='min-w-0 flex-1'>
        <div className='flex items-start justify-between gap-2'>
          <p className='line-clamp-2 text-sm font-medium text-foreground'>{item.title}</p>
          {item.isNew && <span className='mt-1.5 size-2 shrink-0 rounded-full bg-primary' aria-hidden />}
        </div>
        <p className='truncate text-xs text-muted-foreground'>{item.subtitle}</p>
      </div>
    </Link>
  );
}
