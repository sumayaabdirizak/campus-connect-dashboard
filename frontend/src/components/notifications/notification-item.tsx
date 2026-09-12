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
import type { NotifItem, NotifSource } from '@/lib/notifications/services';

const SOURCE_ICON: Record<NotifSource, typeof Megaphone> = {
  announcement: Megaphone,
  assignment: FileText,
  quiz: ClipboardCheck,
  discussion: MessageSquare,
  course: FileText,
};
/** DreamsPOS-style solid icon-chip tones, one per notification source. */
const SOURCE_TONE: Record<NotifSource, string> = {
  announcement: 'bg-primary text-white',
  assignment: 'bg-[#F59E0B] text-white',
  quiz: 'bg-[#10B981] text-white',
  discussion: 'bg-[#8B5CF6] text-white',
  course: 'bg-[#06B6D4] text-white',
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
  const hardNav = item.href.startsWith('/dashboard/courses/');
  return (
    <Link
      href={item.href}
      onClick={(e) => {
        onRead?.();
        onNavigate?.();
        if (hardNav) {
          e.preventDefault();
          window.location.assign(item.href);
        }
      }}
      className={cn(
        'group relative flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        !item.read && 'bg-primary/10/40'
      )}
    >
      {!item.read && (
        <span
          className='absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-[#3B82F6] to-[#8B5CF6]'
          aria-hidden
        />
      )}
      <span
        className={cn(
          'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl',
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
