'use client';

import type { LucideIcon } from 'lucide-react';
import { Button } from '@/features/ui/components/button';
import { EmptyState as UiEmptyState } from '@/features/ui/components/empty-state';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Course-details empty state — thin wrapper around the shared UI primitive
 * so existing `actionLabel`/`onAction` call sites keep working.
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className
}: EmptyStateProps) {
  return (
    <UiEmptyState
      icon={icon}
      title={title}
      description={description}
      className={className}
      action={
        actionLabel && onAction ? (
          <Button onClick={onAction} size='sm'>
            {actionLabel}
          </Button>
        ) : undefined
      }
    />
  );
}
