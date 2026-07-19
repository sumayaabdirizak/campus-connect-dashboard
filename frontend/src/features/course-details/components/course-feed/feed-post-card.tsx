'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { Bot, Clock, Edit, Pin, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CoursePost } from '../../api/feed-types';
import { FeedPostAttachments } from './feed-post-attachments';
import { ReactionStrip } from './reaction-strip';
import { RepliesSection } from './replies-section';
import { SOURCE_LABEL } from './types';

interface FeedPostCardProps {
  post: CoursePost;
  courseId: string;
  userId: number | null;
  userName: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
  onDeleteAttachment: (fileId: number) => void;
}

export function FeedPostCard({
  post: item,
  courseId,
  userId,
  userName,
  onEdit,
  onDelete,
  onReact,
  onDeleteAttachment
}: FeedPostCardProps) {
  return (
    <article
      className={cn(
        'rounded-lg border border-border/60 bg-background p-4 transition-colors hover:bg-muted/20',
        item.isImportant && 'border-l-2 border-l-destructive pl-[calc(1rem-2px)]',
        item.isPinned && 'ring-1 ring-primary/15'
      )}
    >
      <div className='mb-2 flex items-start justify-between gap-3'>
        <div className='min-w-0 flex flex-wrap items-center gap-2'>
          {item.isPinned ? (
            <Pin className='size-3.5 shrink-0 text-primary' aria-label='Pinned' />
          ) : null}
          <h3 className='font-medium leading-snug'>{item.title}</h3>
          {item.isImportant ? (
            <Badge variant='destructive' className='text-[10px]'>
              Important
            </Badge>
          ) : null}
          {item.source && item.source !== 'MANUAL' ? (
            <Badge variant='outline' className='gap-1 text-[10px]'>
              <Bot className='size-3' aria-hidden />
              {SOURCE_LABEL[item.source]}
            </Badge>
          ) : null}
        </div>
        {item.authorId === userId ? (
          <div className='flex shrink-0 gap-0.5'>
            <Button
              variant='ghost'
              size='icon'
              className='size-8'
              onClick={onEdit}
              aria-label='Edit post'
            >
              <Edit className='size-4' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='size-8 text-destructive'
              onClick={onDelete}
              aria-label='Delete post'
            >
              <Trash2 className='size-4' />
            </Button>
          </div>
        ) : null}
      </div>

      <p className='mb-3 select-text whitespace-pre-wrap text-sm text-muted-foreground'>
        {item.content}
      </p>

      <p className='flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground'>
        <Clock className='size-3 shrink-0' aria-hidden />
        <span title={new Date(item.created_at).toLocaleString()}>
          {format(new Date(item.created_at), 'MMM d, yyyy')}
        </span>
        <span aria-hidden>·</span>
        <span>{item.author?.full_name}</span>
        <span aria-hidden>·</span>
        <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
      </p>

      <FeedPostAttachments
        post={item}
        userId={userId}
        onDeleteAttachment={onDeleteAttachment}
      />

      <div className='mt-3 border-t border-border/40 pt-3'>
        <ReactionStrip post={item} userId={userId} onToggle={onReact} />
      </div>

      <RepliesSection
        post={item}
        userId={userId}
        userName={userName}
        courseId={courseId}
      />
    </article>
  );
}
