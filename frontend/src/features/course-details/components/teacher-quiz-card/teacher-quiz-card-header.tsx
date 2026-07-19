import { ClipboardList, CheckSquare, Square, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Quiz } from '../../api/quizzes-types';
import { getQuizWindowState } from './quiz-window-state';

export function TeacherQuizCardHeader({
  quiz: q,
  selected,
  anySelected,
  onToggleSelect
}: {
  quiz: Quiz;
  selected: boolean;
  anySelected: boolean;
  onToggleSelect: () => void;
}) {
  const windowState = getQuizWindowState(q);
  const questionCount = q.questions?.length ?? 0;
  const attemptsCount = q._count?.attempts ?? 0;
  const isEmpty = questionCount === 0;

  return (
    <>
      <button
        type='button'
        onClick={onToggleSelect}
        aria-label={selected ? `Deselect ${q.title}` : `Select ${q.title}`}
        aria-pressed={selected}
        className={`shrink-0 self-start sm:self-center p-1 -m-1 rounded transition-opacity ${
          selected || anySelected
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-60 hover:!opacity-100 focus:opacity-100'
        }`}
      >
        {selected ? (
          <CheckSquare className='w-4 h-4 text-primary' />
        ) : (
          <Square className='w-4 h-4 text-muted-foreground' />
        )}
      </button>

      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-2 flex-wrap'>
          <ClipboardList className='w-4 h-4 text-muted-foreground shrink-0' />
          <p className='font-medium truncate select-none'>{q.title}</p>
          {q.is_draft ? (
            <Badge variant='secondary' className='text-[10px]'>
              Draft
            </Badge>
          ) : (
            windowState && (
              <Badge
                variant={windowState === 'closed' ? 'destructive' : 'outline'}
                className={`text-[10px] capitalize ${
                  windowState === 'open' ? 'text-success border-success' : ''
                }`}
              >
                {windowState}
              </Badge>
            )
          )}
          {isEmpty && (
            <Badge variant='warning' size='xs'>
              No questions
            </Badge>
          )}
        </div>
        <p className='text-xs text-muted-foreground mt-1 tabular-nums'>
          {q.duration_minutes} min · pass ≥ {q.passing_score}%
          {q.max_attempts > 1 && (
            <>
              {' · '}
              {q.max_attempts} attempts
            </>
          )}
          {' · '}
          {questionCount} question
          {questionCount === 1 ? '' : 's'}
          {attemptsCount > 0 && (
            <>
              {' · '}
              <span className='inline-flex items-center gap-0.5'>
                <Users className='w-3 h-3' />
                {attemptsCount} submitted
              </span>
            </>
          )}
        </p>
      </div>
    </>
  );
}
