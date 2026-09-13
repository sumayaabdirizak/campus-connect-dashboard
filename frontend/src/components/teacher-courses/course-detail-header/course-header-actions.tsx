'use client';

import { MessageSquare, ImagePlus, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/features/ui/components/button';

interface CourseHeaderActionsProps {
  compact: boolean;
  canEditCover: boolean;
  onOpenChat: () => void;
  onOpenCover: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function CourseHeaderActions({
  compact,
  canEditCover,
  onOpenChat,
  onOpenCover,
  isCollapsed,
  onToggleCollapse,
}: CourseHeaderActionsProps) {
  const btnClass = compact
    ? 'size-8 shrink-0 gap-0 rounded-lg border border-border bg-card p-0 text-foreground hover:border-border hover:bg-muted hover:text-foreground'
    : 'h-8 shrink-0 gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground hover:border-border hover:bg-muted hover:text-foreground sm:px-3';

  const chatClass =
    'h-8 shrink-0 gap-1.5 rounded-full bg-primary px-3 text-xs font-semibold text-white hover:bg-[#2563EB] hover:text-white';

  return (
    <>
      <Button
        type='button'
        size='sm'
        variant='ghost'
        className={chatClass}
        onClick={onOpenChat}
        aria-label='Course chat'
      >
        <MessageSquare className='size-4 stroke-[2.25]' aria-hidden />
        Chat
      </Button>
      {canEditCover ? (
        <Button
          type='button'
          size='sm'
          variant='ghost'
          className={btnClass}
          onClick={onOpenCover}
          aria-label='Change cover image'
        >
          <ImagePlus className='size-4 stroke-[2.25]' aria-hidden />
          <span className={cn(compact ? 'sr-only' : 'hidden sm:inline')}>
            Cover
          </span>
        </Button>
      ) : null}
      {onToggleCollapse ? (
        <Button
          type='button'
          size='sm'
          variant='ghost'
          className={btnClass}
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand header' : 'Collapse header'}
          aria-label={isCollapsed ? 'Expand header' : 'Collapse header'}
        >
          {isCollapsed ? (
            <ChevronDown className='size-4 stroke-[2.5]' aria-hidden />
          ) : (
            <ChevronUp className='size-4 stroke-[2.5]' aria-hidden />
          )}
          <span className={cn(compact ? 'sr-only' : 'hidden sm:inline')}>
            {isCollapsed ? 'Expand' : 'Collapse'}
          </span>
        </Button>
      ) : null}
    </>
  );
}
