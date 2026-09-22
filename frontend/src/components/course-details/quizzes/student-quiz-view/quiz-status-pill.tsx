'use client';

import { CardStatusPill } from '@/components/course-details/_shared/card-status-pill';
import type { StatusTone } from './student-quiz-card-state';

export function QuizStatusPill({
  label,
  tone,
}: {
  label: string;
  tone: StatusTone;
}) {
  return <CardStatusPill label={label} tone={tone} />;
}
