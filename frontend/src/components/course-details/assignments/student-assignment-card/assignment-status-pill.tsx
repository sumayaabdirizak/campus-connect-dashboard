'use client';

import { CardStatusPill } from '@/components/course-details/_shared/card-status-pill';
import type { StatusTone } from './assignment-card-state';

export function AssignmentStatusPill({
  label,
  tone,
}: {
  label: string;
  tone: StatusTone;
}) {
  return <CardStatusPill label={label} tone={tone} />;
}
