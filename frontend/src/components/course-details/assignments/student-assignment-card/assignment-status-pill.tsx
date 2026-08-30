'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StatusTone } from './assignment-card-state';

const TONE_CLASS: Record<StatusTone, string> = {
  neutral:
    'border border-border bg-muted font-semibold text-foreground',
  sky: 'border border-[#2E90FA] bg-[#EFF8FF] font-semibold text-[#175CD3]',
  amber: 'border border-[#F79009] bg-[#FFFAEB] font-semibold text-[#B54708]',
  emerald: 'border border-[#12B76A] bg-[#ECFDF3] font-semibold text-[#027A48]',
  rose: 'border border-[#F04438] bg-[#FEF3F2] font-semibold text-[#B42318]',
};

export function AssignmentStatusPill({
  label,
  tone,
}: {
  label: string;
  tone: StatusTone;
}) {
  return (
    <Badge
      size='sm'
      className={cn('rounded-full px-2.5 py-0.5', TONE_CLASS[tone])}
    >
      {label}
    </Badge>
  );
}
