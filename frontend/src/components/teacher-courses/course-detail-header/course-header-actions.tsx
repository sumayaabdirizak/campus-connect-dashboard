'use client';

import { MessageSquare, ImagePlus, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/features/ui/components/button';
import { NotificationToggle } from '@/components/notifications/notification-toggle';

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
    ? 'size-8 shrink-0 gap-0 rounded-lg p-0 text-[#667085] hover:bg-[#F8FAFC] hover:text-[#3B82F6]'
    : 'h-8 shrink-0 gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2.5 text-xs font-medium text-[#344054] shadow-none hover:border-[#BFDBFE] hover:bg-[#F8FAFC] hover:text-[#3B82F6] sm:px-3';

  return (
    <>
      <Button
        type='button'
        size='sm'
        variant='ghost'
        className={btnClass}
        onClick={onOpenChat}
        aria-label='Course chat'
      >
        <MessageSquare className='size-3.5' aria-hidden />
        <span className={cn(compact ? 'sr-only' : 'hidden sm:inline')}>Chat</span>
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
          <ImagePlus className='size-3.5' aria-hidden />
          <span className={cn(compact ? 'sr-only' : 'hidden sm:inline')}>
            Cover
          </span>
        </Button>
      ) : null}
      <div className='shrink-0'>
        <NotificationToggle compact />
      </div>
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
            <ChevronDown className='size-3.5' aria-hidden />
          ) : (
            <ChevronUp className='size-3.5' aria-hidden />
          )}
          <span className={cn(compact ? 'sr-only' : 'hidden sm:inline')}>
            {isCollapsed ? 'Expand' : 'Collapse'}
          </span>
        </Button>
      ) : null}
    </>
  );
}
