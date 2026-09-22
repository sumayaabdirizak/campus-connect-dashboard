'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/** Shared across the student assignment card and quiz card so both read the
 *  same visual language for status — previously each had its own pill with a
 *  different color system (hardcoded light-tint hex vs. solid semantic bg). */
export type CardStatusTone = 'neutral' | 'sky' | 'amber' | 'emerald' | 'rose';

const TONE_CLASS: Record<CardStatusTone, string> = {
  neutral: 'border border-border bg-muted font-semibold text-foreground',
  sky: 'border border-[#2E90FA] bg-[#EFF8FF] font-semibold text-[#175CD3]',
  amber: 'border border-[#F79009] bg-[#FFFAEB] font-semibold text-[#B54708]',
  emerald: 'border border-[#12B76A] bg-[#ECFDF3] font-semibold text-[#027A48]',
  rose: 'border border-[#F04438] bg-[#FEF3F2] font-semibold text-[#B42318]',
};

export function CardStatusPill({
  label,
  tone,
}: {
  label: string;
  tone: CardStatusTone;
}) {
  return (
    <Badge size='sm' className={cn('rounded-full px-2.5 py-0.5', TONE_CLASS[tone])}>
      {label}
    </Badge>
  );
}
