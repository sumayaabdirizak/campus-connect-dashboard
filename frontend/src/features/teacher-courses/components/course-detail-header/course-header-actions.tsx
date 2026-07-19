'use client';

import { MessageSquare, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NotificationToggle } from '@/features/notifications/notification-toggle';

interface CourseHeaderActionsProps {
  compact: boolean;
  canEditCover: boolean;
  onOpenChat: () => void;
  onOpenCover: () => void;
}

export function CourseHeaderActions({
  compact,
  canEditCover,
  onOpenChat,
  onOpenCover
}: CourseHeaderActionsProps) {
  const bannerActionClass =
    'border-0 bg-white/95 text-foreground shadow-sm hover:bg-white hover:text-foreground [&_svg]:text-foreground';

  return (
    <>
      <Button
        type='button'
        size='sm'
        variant={compact ? 'ghost' : 'secondary'}
        className={cn(
          'size-8 shrink-0 gap-0 p-0 sm:h-8 sm:w-auto sm:gap-1.5 sm:px-2.5 sm:text-xs',
          !compact && bannerActionClass
        )}
        onClick={onOpenChat}
        aria-label='Course chat'
      >
        <MessageSquare className='size-3.5 sm:size-4' aria-hidden />
        <span className='hidden sm:inline'>Chat</span>
      </Button>
      {canEditCover && (
        <Button
          type='button'
          size='sm'
          variant={compact ? 'ghost' : 'secondary'}
          className={cn(
            'size-8 shrink-0 gap-0 p-0 sm:h-8 sm:w-auto sm:gap-1.5 sm:px-2.5 sm:text-xs',
            !compact && bannerActionClass
          )}
          onClick={onOpenCover}
          aria-label='Change cover image'
        >
          <ImagePlus className='size-3.5 sm:size-4' aria-hidden />
          <span className='hidden sm:inline'>Cover</span>
        </Button>
      )}
      <div
        className={cn(
          'shrink-0 text-foreground',
          !compact && 'rounded-md bg-white/95 p-0.5 shadow-sm'
        )}
      >
        <NotificationToggle compact />
      </div>
    </>
  );
}
