'use client';

import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, FileQuestion, Printer, Timer } from 'lucide-react';
import type { Quiz } from '@/lib/course-details/services/quizzes-types';
import { QuizStatusPill } from './quiz-status-pill';
import type { StudentQuizCardState } from './student-quiz-card-state';

export function QuizCardSummaryRow({
  quiz,
  state,
  expanded,
  onToggle
}: {
  quiz: Quiz;
  state: StudentQuizCardState;
  expanded: boolean;
  onToggle: () => void;
}) {
  const scheduleShort =
    state.scheduleLine?.replace(/^Opens\s+/i, '').replace(/^Open until\s+/i, '') ??
    (state.isOffline ? 'Printed' : `${state.durationMinutes} min`);

  return (
    <div>
      <div className='flex items-start justify-between gap-3'>
        <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground'>
          <span className='inline-flex items-center gap-1'>
            <CalendarDays className='size-3.5 text-primary' aria-hidden />
            {scheduleShort}
          </span>
          {state.isOffline ? (
            <span className='inline-flex items-center gap-1'>
              <Printer className='size-3.5 text-info' aria-hidden />
              Printed
            </span>
          ) : (
            <span className='inline-flex items-center gap-1'>
              <Clock className='size-3.5 text-warning' aria-hidden />
              {state.durationMinutes} min
            </span>
          )}
          <span className='inline-flex items-center gap-1'>
            <FileQuestion className='size-3.5 text-info' aria-hidden />
            {state.questionCount}
          </span>
          {state.totalMarks > 0 ? (
            <span className='inline-flex items-center gap-1'>
              <Timer className='size-3.5 text-warning' aria-hidden />
              {Math.round(state.totalMarks)} marks
            </span>
          ) : null}
        </div>
        <QuizStatusPill label={state.status.label} tone={state.status.tone} />
      </div>

      <h3 className='mt-3 line-clamp-2 text-lg tracking-tight text-foreground font-display'>
        {quiz.title}
      </h3>
      {quiz.description ? (
        <p className='mt-2 text-sm text-foreground'>{quiz.description}</p>
      ) : null}
      {state.scheduleLine ? (
        <p className='mt-1 text-right text-sm text-foreground'>{state.scheduleLine}</p>
      ) : state.marksLine ? (
        <p className='mt-1 text-right text-sm text-foreground'>{state.marksLine}</p>
      ) : null}

      <Button
        type='button'
        size='sm'
        className='mt-3 rounded-full'
        aria-expanded={expanded}
        onClick={onToggle}
      >
        {expanded ? 'Show less' : 'Read more'}
      </Button>
    </div>
  );
}
