'use client';

import { Smile } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/features/ui/components/popover';
import type { CoursePost, CoursePostReaction } from '@/lib/course-details/types';
import { REACTION_PALETTE } from './types';

function groupReactions(reactions: CoursePostReaction[]) {
  const map = new Map<string, { count: number; userIds: number[] }>();
  for (const r of reactions) {
    const cur = map.get(r.emoji) ?? { count: 0, userIds: [] };
    cur.count += 1;
    cur.userIds.push(r.userId);
    map.set(r.emoji, cur);
  }
  return map;
}

export function ReactionStrip({
  post,
  userId,
  onToggle
}: {
  post: CoursePost;
  userId: number | null;
  onToggle: (emoji: string) => void;
}) {
  const entries = Array.from(groupReactions(post.reactions ?? []).entries());

  return (
    <div className='flex items-center gap-1 flex-wrap'>
      {entries.map(([emoji, info]) => {
        const isMine = userId != null && info.userIds.includes(userId);
        return (
          <button
            key={emoji}
            type='button'
            onClick={() => onToggle(emoji)}
            className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border transition-colors ${
              isMine
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-transparent bg-muted/40 hover:bg-muted/70'
            }`}
            aria-label={`React with ${emoji}`}
          >
            <span>{emoji}</span>
            <span className='tabular-nums'>{info.count}</span>
          </button>
        );
      })}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type='button'
            className='inline-flex items-center justify-center w-6 h-6 rounded-full hover:bg-muted/70 text-muted-foreground'
            aria-label='Add reaction'
          >
            <Smile className='w-3.5 h-3.5' />
          </button>
        </PopoverTrigger>
        <PopoverContent align='start' className='w-auto p-1'>
          <div className='flex gap-1'>
            {REACTION_PALETTE.map((emoji) => (
              <button
                key={emoji}
                type='button'
                onClick={() => onToggle(emoji)}
                className='text-lg hover:bg-muted/60 rounded p-1 transition-colors'
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
