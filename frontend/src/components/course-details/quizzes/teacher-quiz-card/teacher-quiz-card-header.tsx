import { ClipboardList, CheckSquare, Square, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Quiz } from '@/lib/course-details/services/quizzes-types';
import {
  isQuizMissingBuiltQuestions,
  isUploadedOfflineQuiz,
  isUploadedQuizMissingPaper
} from '@/lib/course-details/services/quiz-total-points';
import { useCourseLiveNow } from '@/components/course-details/course-live-clock';
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
  useCourseLiveNow();
  const windowState = getQuizWindowState(q);
  const questionCount = q.questions?.length ?? 0;
  const attemptsCount = q._count?.attempts ?? 0;
  const missingQuestions = isQuizMissingBuiltQuestions(q);
  const missingPaper = isUploadedQuizMissingPaper(q);
  const uploadedPaper = isUploadedOfflineQuiz(q);

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
          <span className='shrink-0 grid place-items-center w-7 h-7 rounded-lg bg-accent text-accent-foreground'>
            <ClipboardList className='w-3.5 h-3.5' />
          </span>
          <p className='truncate text-sm font-semibold tracking-tight text-foreground font-display select-none'>
            {q.title}
          </p>
          {q.is_draft ? (
            <Badge variant='secondary' size='xs' className='rounded-full'>
              Draft
            </Badge>
          ) : (
            windowState && (
              <Badge
                variant={
                  windowState === 'closed'
                    ? 'destructive'
                    : windowState === 'open'
                      ? 'success'
                      : 'info'
                }
                size='xs'
                className='rounded-full capitalize'
              >
                {windowState}
              </Badge>
            )
          )}
          {missingQuestions && (
            <Badge variant='warning' size='xs' className='rounded-full'>
              No questions
            </Badge>
          )}
          {missingPaper && (
            <Badge variant='warning' size='xs' className='rounded-full'>
              No file
            </Badge>
          )}
          {uploadedPaper && q.paperFile && (
            <Badge variant='secondary' size='xs' className='rounded-full'>
              Uploaded
            </Badge>
          )}
          {q.mode === 'offline' && (
            <Badge variant='outline' size='xs' className='rounded-full'>
              Offline
            </Badge>
          )}
        </div>
        <p className='text-xs text-muted-foreground mt-1 tabular-nums'>
          {q.duration_minutes} min
          {q.max_attempts > 1 && (
            <>
              {' · '}
              {q.max_attempts} attempts
            </>
          )}
          {' · '}
          {uploadedPaper
            ? 'Uploaded paper'
            : `${questionCount} question${questionCount === 1 ? '' : 's'}`}
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
