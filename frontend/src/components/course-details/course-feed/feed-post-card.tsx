'use client';

import { useState } from 'react';
import { Bot, Clock, Edit, MoreHorizontal, Trash2 } from 'lucide-react';
import { Badge } from '@/features/ui/components/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/features/ui/components/popover';
import { timeAgoLong } from '@/lib/format-time';
import type { CoursePost } from '@/lib/course-details/types';
import { FeedEngagement } from './feed-engagement';
import { SOURCE_LABEL } from './types';

function authorInitials(name?: string | null) {
  if (!name?.trim()) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

interface FeedPostCardProps {
  post: CoursePost;
  courseId: string;
  userId: number | null;
  userName: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
}

export function FeedPostCard({
  post: item,
  courseId,
  userId,
  userName,
  onEdit,
  onDelete,
  onReact
}: FeedPostCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isAuthor = item.authorId === userId;
  const authorName = item.author?.full_name ?? 'Unknown';

  return (
    <article className='w-full rounded-xl border border-border bg-card p-5 transition-shadow duration-200 hover:shadow-md'>
      <div className='mb-4 flex items-start justify-between gap-3'>
        <div className='flex min-w-0 flex-1 items-center gap-3'>
          <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary'>
            {authorInitials(authorName)}
          </div>
          <div className='min-w-0 flex-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <p className='truncate text-sm font-bold text-foreground'>{authorName}</p>
              {item.source && item.source !== 'MANUAL' ? (
                <Badge variant='outline' className='gap-1 rounded-full text-[10px]'>
                  <Bot className='size-3' aria-hidden />
                  {SOURCE_LABEL[item.source]}
                </Badge>
              ) : null}
            </div>
            <p
              className='mt-0.5 flex items-center gap-1 text-xs text-muted-foreground'
              title={new Date(item.created_at).toLocaleString()}
            >
              <Clock className='h-3.5 w-3.5' aria-hidden />
              {timeAgoLong(item.created_at)}
            </p>
          </div>
        </div>

        {isAuthor ? (
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type='button'
                aria-label='Post options'
                className='shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-muted-foreground'
              >
                <MoreHorizontal className='h-4 w-4' />
              </button>
            </PopoverTrigger>
            <PopoverContent align='end' className='w-40 p-1'>
              <button
                type='button'
                onClick={() => {
                  setMenuOpen(false);
                  onEdit();
                }}
                className='flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted'
              >
                <Edit className='h-3.5 w-3.5' />
                Edit post
              </button>
              <button
                type='button'
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
                className='flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-red-600 transition-colors hover:bg-red-50'
              >
                <Trash2 className='h-3.5 w-3.5' />
                Delete post
              </button>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>

      {item.title?.trim() ? (
        <h3 className='mb-1.5 text-sm font-semibold text-foreground'>{item.title}</h3>
      ) : null}

      <p className='select-text whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground'>
        {item.content}
      </p>

      <div className='my-3 h-px bg-border' />

      <FeedEngagement
        post={item}
        userId={userId}
        userName={userName}
        courseId={courseId}
        onReact={onReact}
      />
    </article>
  );
}
