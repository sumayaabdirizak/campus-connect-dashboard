import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { Announcement } from '@/lib/announcements/types';

/**
 * WCAG 1.4.1 Use of Color: priority must be conveyed by something other than
 * color. Returns an icon-and-text badge so screen readers and color-blind users
 * receive equivalent information.
 */
export function PriorityBadge({ priority }: { priority: Announcement['priority'] | undefined }) {
  if (priority !== 'urgent' && priority !== 'important') return null;
  const isUrgent = priority === 'urgent';
  const label = isUrgent ? 'Urgent' : 'Important';
  return (
    <span
      role='img'
      aria-label={`${label} priority`}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset',
        isUrgent
          ? 'bg-destructive/15 text-destructive ring-destructive/40'
          : 'bg-amber-500/15 text-amber-800 ring-amber-500/35 dark:text-amber-300'
      )}
    >
      {isUrgent ? (
        <Icons.warning className='size-2.5' aria-hidden />
      ) : (
        <Icons.info className='size-2.5' aria-hidden />
      )}
      {label}
    </span>
  );
}
