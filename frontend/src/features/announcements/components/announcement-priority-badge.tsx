import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { Announcement } from '../api/types';

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
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ring-1 ring-inset',
        isUrgent
          ? 'bg-destructive/10 text-destructive ring-destructive/20'
          : 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-400'
      )}
    >
      {isUrgent ? (
        <Icons.warning className='size-3' aria-hidden />
      ) : (
        <Icons.info className='size-3' aria-hidden />
      )}
      {label}
    </span>
  );
}
