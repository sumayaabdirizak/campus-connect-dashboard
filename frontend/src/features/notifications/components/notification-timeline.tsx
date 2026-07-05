'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
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

// Outline-circle accent per source (hex so it works on the bordered badge).
const SOURCE_COLOR: Record<NotifSource, string> = {
  announcement: '#0468CE',
  assignment: '#F59E0B',
  quiz: '#16A34A',
  discussion: '#7C3AED'
};

function rel(at: string): string {
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? '' : formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Vertical timeline list of notifications — circular outlined icon badges
 * connected by a running line, with the relative time on the right.
 */
export function NotificationTimeline({
  items,
  onRead
}: {
  items: NotifItem[];
  onRead?: (item: NotifItem) => void;
}) {
  return (
    <ul className='px-1'>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const isClub = item.source === 'discussion' && item.type.startsWith('CLUB');
        const Icon = isClub ? Users : SOURCE_ICON[item.source];
        const color = SOURCE_COLOR[item.source];
        return (
          <li key={item.key}>
            <Link
              href={item.href}
              onClick={() => onRead?.(item)}
              className={cn(
                'flex items-stretch gap-4 rounded-lg px-2 transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                !item.read && 'bg-primary/5'
              )}
            >
              {/* Icon column + connector */}
              <div className='flex flex-col items-center'>
                <span
                  className='z-10 mt-3 flex size-10 shrink-0 items-center justify-center rounded-full border-2 bg-card'
                  style={{
                    borderColor: item.read ? 'var(--border)' : color,
                    color: item.read ? 'var(--muted-foreground)' : color
                  }}
                >
                  <Icon className='size-4' />
                </span>
                {!isLast && <span className='w-px flex-1 bg-border' aria-hidden />}
              </div>

              {/* Content */}
              <div className='flex min-w-0 flex-1 items-start justify-between gap-3 py-3'>
                <div className='min-w-0'>
                  <p
                    className={cn(
                      'text-sm text-foreground',
                      item.read ? 'font-medium' : 'font-semibold'
                    )}
                  >
                    {item.title}
                    {!item.read && (
                      <span
                        className='ml-1.5 inline-block size-1.5 rounded-full bg-primary align-middle'
                        aria-hidden
                      />
                    )}
                  </p>
                  <p className='mt-0.5 truncate text-xs text-muted-foreground'>{item.body}</p>
                </div>
                <span className='shrink-0 whitespace-nowrap text-xs text-muted-foreground'>
                  {rel(item.at)}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
