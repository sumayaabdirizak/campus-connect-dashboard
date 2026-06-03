import { type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  /** Optional leading icon (lucide). */
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Optional call-to-action (e.g. a Button or link). */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Shared empty-state primitive for "no results / nothing here yet" surfaces.
 * Token-driven (works in every theme + dark mode) so empty states stay
 * consistent instead of being hand-rolled per feature.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-10 text-center',
        className
      )}
    >
      {Icon && <Icon className='text-muted-foreground size-8' aria-hidden='true' />}
      <h3 className='text-foreground text-sm font-medium'>{title}</h3>
      {description && (
        <p className='text-muted-foreground max-w-sm text-sm text-balance'>{description}</p>
      )}
      {action && <div className='mt-2'>{action}</div>}
    </div>
  );
}
