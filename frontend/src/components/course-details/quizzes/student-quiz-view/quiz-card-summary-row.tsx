'use client';

import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, FileQuestion, Printer, Timer } from 'lucide-react';
import type { Quiz } from '@/lib/course-details/services/quizzes-types';
import { CardMetaChip } from '@/components/course-details/_shared/card-meta-chip';
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

/** Title + status pill share a row (product-name + tag convention), then the
 *  description sits underneath — matches the reference template's product
 *  tile shape more closely than the old separate meta-only header. */
export function QuizCardTitleRow({
  quiz,
  state,
  expanded
}: {
  quiz: Quiz;
  state: StudentQuizCardState;
  expanded: boolean;
}) {
  return (
    <div className='min-w-0'>
      <div className='flex items-start justify-between gap-2'>
        <h3 className='line-clamp-2 text-lg tracking-tight text-foreground font-display'>
          {quiz.title}
        </h3>
        <div className='shrink-0 pt-0.5'>
          <QuizStatusPill label={state.status.label} tone={state.status.tone} />
        </div>
      </div>
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

export function QuizCardMetaRow({
  quiz,
  state
}: {
  quiz: Quiz;
  state: StudentQuizCardState;
}) {
  const dueShort = scheduleShortDate(quiz, state);
  return (
    <div className='flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs'>
      <CardMetaChip icon={CalendarDays}>{dueShort}</CardMetaChip>
      {state.isOffline ? (
        <CardMetaChip icon={Printer}>Printed</CardMetaChip>
      ) : (
        <CardMetaChip icon={Clock}>{state.durationMinutes} min</CardMetaChip>
      )}
      <CardMetaChip icon={FileQuestion}>{state.questionCount}</CardMetaChip>
      {state.totalMarks > 0 ? (
        <CardMetaChip icon={Timer}>{Math.round(state.totalMarks)} pts</CardMetaChip>
      ) : null}
    </div>
  );
}

/** Bottom bar: bold primary info (left, like a product's price) + the
 *  action button (right). */
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
      <p className='min-w-0 truncate text-sm font-bold text-foreground'>{footerLine}</p>
      <Button
        type='button'
        size='sm'
        className='shrink-0 rounded-full'
        aria-expanded={expanded}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        {expanded ? 'Show less' : 'Read more'}
      </Button>
    </footer>
  );
}

/** @deprecated Prefer QuizCardTitleRow / MetaRow / Footer — kept for any stray imports. */
export function QuizCardHeader({ quiz, state }: { quiz: Quiz; state: StudentQuizCardState }) {
  return <QuizCardMetaRow quiz={quiz} state={state} />;
}

/** @deprecated Prefer QuizCardTitleRow. */
export function QuizCardBody({ quiz, expanded }: { quiz: Quiz; expanded: boolean }) {
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
