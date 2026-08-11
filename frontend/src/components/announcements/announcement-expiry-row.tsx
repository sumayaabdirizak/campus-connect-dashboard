import { differenceInCalendarDays, formatDistanceStrict } from 'date-fns';
import { Icons } from '@/components/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/features/ui/components/tooltip';
import { useAuthStore } from '@/lib/auth-store';
import { Announcement } from '@/lib/announcements/types';

export function AnnouncementExpiryRow({
  announcement,
  canManage
}: {
  announcement: Announcement;
  canManage: boolean;
}) {
  const { user } = useAuthStore();
  const st = String(announcement.status ?? '').toUpperCase();

  const me = user?.id != null ? Number(user.id) : NaN;
  const creatorId = announcement.createdBy?.id != null ? Number(announcement.createdBy.id) : NaN;
  const isAuthor = Number.isFinite(me) && Number.isFinite(creatorId) && me === creatorId;
  const showPublisherPin = isAuthor || Boolean(canManage);

  if (st === 'EXPIRED' && showPublisherPin) {
    return (
      <div className='mb-2'>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                role='img'
                aria-label='Expired announcement'
                tabIndex={0}
                className='inline-flex cursor-default items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'
              >
                <Icons.calendar className='size-3 opacity-70' aria-hidden />
                Expired
              </span>
            </TooltipTrigger>
            <TooltipContent side='top' className='max-w-xs text-xs leading-snug'>
              This announcement is no longer active. You still see it here so you can review or archive it.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  const expiresRaw = announcement.expiresAt;
  const pinUntil = expiresRaw ? new Date(expiresRaw) : null;
  if (!pinUntil || Number.isNaN(pinUntil.getTime())) return null;

  const now = Date.now();
  const isPublishedVisible = st === 'PUBLISHED' && announcement.isActive !== false;

  if (pinUntil.getTime() > now) {
    const days = differenceInCalendarDays(pinUntil, new Date());
    if (days > 60) return null;
    if (isPublishedVisible) {
      const distance = formatDistanceStrict(pinUntil, new Date(), { roundingMethod: 'ceil' });
      return (
        <p className='mb-2 text-[11px] text-muted-foreground'>
          <time dateTime={pinUntil.toISOString()}>Active · ends in {distance}</time>
        </p>
      );
    }
    if (showPublisherPin && st === 'DRAFT') {
      const distance = formatDistanceStrict(pinUntil, new Date(), { roundingMethod: 'ceil' });
      return (
        <p className='mb-2 text-[11px] text-muted-foreground'>
          <time dateTime={pinUntil.toISOString()}>Will be active · ends in {distance}</time>
        </p>
      );
    }
    return null;
  }

  return null;
}
