'use client';

import { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ChannelMember } from '../../api/types';
import { avatarGradient } from '../../utils/avatar-color';

const MAX_RESULTS = 7;

function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

/** First word of a name, stripped of non-word chars — same shape the backend
 *  uses to resolve `@handle` against members (mentionResolution.js). */
export function firstNameHandle(fullName: string | null | undefined): string {
  return String(fullName ?? '')
    .trim()
    .split(/\s+/)[0]
    ?.replace(/[^\w]/g, '')
    ?? '';
}

/** Filter channel members by a free-text query against first name + full name +
 *  member number. Excludes the caller. Returns up to MAX_RESULTS rows. */
export function filterMentionCandidates(
  members: ChannelMember[],
  query: string,
  myUserId: number | null
): ChannelMember[] {
  const q = query.trim().toLowerCase();
  const matches: ChannelMember[] = [];
  for (const m of members) {
    if (!m.user) continue;
    if (myUserId != null && Number(m.userId) === myUserId) continue;
    if (q === '') {
      matches.push(m);
    } else {
      const haystack = [
        m.user.full_name,
        firstNameHandle(m.user.full_name),
        m.user.number,
        m.user.email
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (haystack.includes(q)) matches.push(m);
    }
    if (matches.length >= MAX_RESULTS) break;
  }
  return matches;
}

export function MentionPopover({
  members,
  query,
  selectedIndex,
  onHover,
  onSelect
}: {
  members: ChannelMember[];
  query: string;
  selectedIndex: number;
  onHover: (index: number) => void;
  onSelect: (member: ChannelMember) => void;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);

  // Keep the active row in view as the user arrows through.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-mention-index="${selectedIndex}"]`
    );
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (members.length === 0) return null;

  return (
    <div
      role='listbox'
      aria-label='Mention suggestions'
      className={cn(
        'absolute bottom-full left-0 z-30 mb-2 w-72 overflow-hidden rounded-lg border bg-popover shadow-lg'
      )}
    >
      <div className='border-b px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
        People matching {query ? `"${query}"` : '@'}
      </div>
      <ScrollArea className='max-h-64'>
        <div ref={listRef} className='py-1'>
          {members.map((m, i) => {
            const name = m.user?.full_name ?? `Member ${m.userId}`;
            const handle = firstNameHandle(name);
            const isSelected = i === selectedIndex;
            return (
              <button
                key={m.userId}
                data-mention-index={i}
                role='option'
                aria-selected={isSelected}
                type='button'
                onMouseEnter={() => onHover(i)}
                // Use mousedown instead of click so the textarea doesn't lose
                // focus before the insert runs.
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(m);
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors',
                  isSelected ? 'bg-muted/70' : 'hover:bg-muted/50'
                )}
              >
                <Avatar className='h-6 w-6 shrink-0'>
                  <AvatarFallback
                    className='text-[10px] font-semibold text-white'
                    style={{ background: avatarGradient(name) }}
                  >
                    {initialsFor(name)}
                  </AvatarFallback>
                </Avatar>
                <div className='min-w-0 flex-1'>
                  <div className='truncate text-xs font-medium'>{name}</div>
                  <div className='truncate text-[10px] text-muted-foreground'>
                    @{handle || m.user?.number || m.userId}
                  </div>
                </div>
                {m.user?.role && (
                  <span className='shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] uppercase text-muted-foreground'>
                    {String(m.user.role).replace(/_/g, ' ')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
      <div className='border-t bg-muted/30 px-3 py-1 text-[10px] text-muted-foreground'>
        ↑↓ navigate · Enter / Tab to insert · Esc to close
      </div>
    </div>
  );
}
