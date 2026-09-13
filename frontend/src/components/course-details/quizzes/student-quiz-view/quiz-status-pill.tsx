'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StatusTone } from './student-quiz-card-state';

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: 'border-transparent bg-secondary text-secondary-foreground',
  sky: 'border-transparent bg-info text-info-foreground',
  amber: 'border-transparent bg-warning text-white',
  emerald: 'border-transparent bg-success text-success-foreground',
  rose: 'border-transparent bg-destructive text-white'
};

export function QuizStatusPill({
  label,
  tone
}: {
  label: string;
  tone: StatusTone;
}) {
  return (
    <Badge size='sm' className={cn('rounded-full px-2.5', TONE_CLASS[tone])}>
      {label}
    </Badge>
  );
}
