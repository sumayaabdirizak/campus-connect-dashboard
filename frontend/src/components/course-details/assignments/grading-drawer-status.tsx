'use client';

import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileQuestion,
  XIcon
} from 'lucide-react';
import type { Submission } from '@/lib/course-details/services/assignments-types';
import { isSubmissionGraded } from './shared';
import { cn } from '@/lib/utils';
import { gradingBlue } from './grading-drawer-blue';

export type DrawerStatusTone = 'success' | 'warning' | 'info' | 'muted' | 'destructive';

export function getDrawerStatus(
  sub: Submission,
  cap: number
): { label: string; tone: DrawerStatusTone } {
  const graded = isSubmissionGraded(sub);
  if (graded) {
    return {
      label: `Graded · ${Math.round((sub.grade! / cap) * 100)}%`,
      tone: 'success'
    };
  }
  if (sub.content_url) {
    return sub.is_late
      ? { label: 'Submitted late · needs grading', tone: 'warning' }
      : { label: 'Submitted · needs grading', tone: 'info' };
  }
  if (sub.is_reviewed) {
    return { label: 'Reviewed · no grade', tone: 'muted' };
  }
  return { label: 'No submission yet', tone: 'destructive' };
}

const toneStyles: Record<
  DrawerStatusTone,
  { badge: string; icon: typeof CheckCircle2 }
> = {
  success: {
    badge: 'border-success/40 bg-success-muted text-success-foreground',
    icon: CheckCircle2
  },
  warning: {
    badge: 'border-warning/40 bg-warning-muted text-warning-foreground',
    icon: AlertTriangle
  },
  info: {
    badge: gradingBlue.badgeNeedsGrading,
    icon: Clock
  },
  muted: {
    badge: 'border-border bg-muted text-muted-foreground',
    icon: FileQuestion
  },
  destructive: {
    badge: 'border-destructive/30 bg-destructive/5 text-destructive',
    icon: XIcon
  }
};

export function GradingDrawerStatusBadge({
  sub,
  cap
}: {
  sub: Submission;
  cap: number;
}) {
  const status = getDrawerStatus(sub, cap);
  const style = toneStyles[status.tone];
  const Icon = style.icon;

  return (
    <Badge variant='outline' className={cn('mt-2 gap-1.5 font-normal', style.badge)}>
      <Icon className='size-3.5 shrink-0' aria-hidden />
      {status.label}
    </Badge>
  );
}

export function studentInitials(name: string | undefined): string {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}
