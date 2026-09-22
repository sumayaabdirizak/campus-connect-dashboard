import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** Icon + label chip for a card's meta row (due date, duration, points…).
 *  Shared by the assignment and quiz cards so the meta row reads consistently
 *  — icons stay neutral (like the course-card meta row) and only the status
 *  pill carries color, instead of each field tinting its own icon. */
export function CardMetaChip({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <span className='inline-flex items-center gap-1 text-muted-foreground'>
      <Icon className='size-3.5' aria-hidden />
      <span className='text-foreground'>{children}</span>
    </span>
  );
}
