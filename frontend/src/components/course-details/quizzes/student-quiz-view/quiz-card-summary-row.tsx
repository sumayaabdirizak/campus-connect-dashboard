'use client';

import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, FileQuestion, Printer, Timer } from 'lucide-react';
import type { Quiz } from '@/lib/course-details/services/quizzes-types';
import { quizWindowEnd } from '../quiz-schedule-display';
import { QuizStatusPill } from './quiz-status-pill';
import type { StudentQuizCardState } from './student-quiz-card-state';

function scheduleShortDate(quiz: Quiz, state: StudentQuizCardState): string {
  const end = quizWindowEnd(quiz);
  if (end) return format(end, 'MMM d');
  if (quiz.open_at) {
    const d = new Date(quiz.open_at);
    if (!Number.isNaN(d.getTime())) return format(d, 'MMM d');
  }
  if (quiz.close_at) {
    const d = new Date(quiz.close_at);
    if (!Number.isNaN(d.getTime())) return format(d, 'MMM d');
  }
  return state.isOffline ? 'Printed' : `${state.durationMinutes} min`;
}

export function QuizCardHeader({
  quiz,
  state
}: {
  quiz: Quiz;
  state: StudentQuizCardState;
}) {
  const dueShort = scheduleShortDate(quiz, state);

  return (
    <header className='flex shrink-0 items-start justify-between gap-3'>
      <div className='flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground'>
        <span className='inline-flex items-center gap-1'>
          <CalendarDays className='size-3.5 text-primary' aria-hidden />
          {dueShort}
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
            {Math.round(state.totalMarks)} pts
          </span>
        ) : null}
      </div>
      <QuizStatusPill label={state.status.label} tone={state.status.tone} />
    </header>
  );
}

export function QuizCardBody({
  quiz,
  expanded
}: {
  quiz: Quiz;
  expanded: boolean;
}) {
  return (
    <div className='min-w-0'>
      <h3 className='line-clamp-2 text-lg tracking-tight text-foreground font-display'>
        {quiz.title}
      </h3>
      {quiz.description ? (
        <p
          className={
            expanded
              ? 'mt-2 text-sm text-foreground'
              : 'mt-2 line-clamp-2 text-sm text-foreground'
          }
        >
          {quiz.description}
        </p>
      ) : null}
    </div>
  );
}

export function QuizCardFooter({
  state,
  expanded,
  onToggle
}: {
  state: StudentQuizCardState;
  expanded: boolean;
  onToggle: () => void;
}) {
  const footerLine =
    state.scheduleLine ??
    state.marksLine ??
    (state.isOffline
      ? 'Printed quiz'
      : `${state.durationMinutes} min · ${state.questionCount} questions`);

  return (
    <footer className='flex shrink-0 items-center justify-between gap-3'>
      <Button
        type='button'
        size='sm'
        className='rounded-full'
        aria-expanded={expanded}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        {expanded ? 'Show less' : 'Read more'}
      </Button>
      <p className='min-w-0 truncate text-right text-sm text-muted-foreground'>
        {footerLine}
      </p>
    </footer>
  );
}

/** @deprecated Prefer QuizCardHeader / Body / Footer — kept for any stray imports. */
export function QuizCardSummaryRow(props: {
  quiz: Quiz;
  state: StudentQuizCardState;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <QuizCardHeader quiz={props.quiz} state={props.state} />
      <div className='mt-3'>
        <QuizCardBody quiz={props.quiz} expanded={props.expanded} />
      </div>
      <div className='mt-3'>
        <QuizCardFooter
          state={props.state}
          expanded={props.expanded}
          onToggle={props.onToggle}
        />
      </div>
    </>
  );
}
