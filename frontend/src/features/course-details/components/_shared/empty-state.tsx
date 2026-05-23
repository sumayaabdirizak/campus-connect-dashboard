'use client';

import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/// Reusable empty state for course-details tabs. Replaces the various
/// "No items yet" muted-text placeholders with a consistent icon + headline +
/// description + single primary CTA pattern.
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction
}: EmptyStateProps) {
  return (
    <div className='border border-dashed rounded-lg p-10 text-center space-y-3'>
      <div className='mx-auto w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center'>
        <Icon className='w-6 h-6 text-muted-foreground' />
      </div>
      <div className='space-y-1'>
        <p className='font-medium'>{title}</p>
        {description && (
          <p className='text-sm text-muted-foreground max-w-sm mx-auto'>{description}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} size='sm'>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
