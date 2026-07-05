'use client';

import Link from 'next/link';
import {
  Megaphone,
  FileText,
  ClipboardCheck,
  MessageSquare,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NotifItem, NotifSource } from '../utils/use-notification-feed';

const SOURCE_ICON: Record<NotifSource, typeof Megaphone> = {
  announcement: Megaphone,
  assignment: FileText,
  quiz: ClipboardCheck,
  discussion: MessageSquare
};
const SOURCE_TONE: Record<NotifSource, string> = {
  announcement: 'bg-primary/10 text-primary',
  assignment: 'bg-info-muted text-info',
  quiz: 'bg-success-muted text-success',
  discussion: 'bg-accent text-accent-foreground'
};

/** A single notification row — typed icon badge, unread highlight, mark-read on click. */
export function NotificationItem({
  item,
  onNavigate,
  onRead
}: {
  item: NotifItem;
  onNavigate?: () => void;
  onRead?: () => void;
}) {
  const isClub = item.source === 'discussion' && item.type.startsWith('CLUB');
  const Icon = isClub ? Users : SOURCE_ICON[item.source];
  return (
    <Link
      href={item.href}
      onClick={() => {
        onRead?.();
        onNavigate?.();
      }}
      className={cn(
        'flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        !item.read && 'bg-primary/5'
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full',
          SOURCE_TONE[item.source]
        )}
      >
        <Icon className='size-4' />
      </span>
      <div className='min-w-0 flex-1'>
        <div className='flex items-start justify-between gap-2'>
          <p
            className={cn(
              'line-clamp-2 text-sm text-foreground',
              item.read ? 'font-medium' : 'font-semibold'
            )}
          >
            {item.title}
          </p>
          {!item.read && (
            <span className='mt-1.5 size-2 shrink-0 rounded-full bg-primary' aria-hidden />
          )}
        </div>
        <p className='truncate text-xs text-muted-foreground'>{item.subtitle}</p>
      </div>
    </Link>
  );
}
