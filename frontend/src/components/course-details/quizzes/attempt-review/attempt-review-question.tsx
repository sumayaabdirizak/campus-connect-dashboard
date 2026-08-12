import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Lightbulb, XCircle } from 'lucide-react';
import type { QuizAttempt, QuizQuestion } from '@/lib/course-details/services/quizzes-types';

type AttemptReviewAnswer = NonNullable<QuizAttempt['answers']>[number];

interface AttemptReviewQuestionProps {
  question: QuizQuestion;
  index: number;
  answer?: AttemptReviewAnswer;
}

export function AttemptReviewQuestion({ question: q, index, answer: ans }: AttemptReviewQuestionProps) {
  const earned = ans?.points_earned ?? 0;
  const wasAnswered =
    (ans?.selected_option_id ?? null) !== null ||
    (ans?.text_answer != null && ans.text_answer.trim() !== '');
  const isCorrect = ans?.is_correct === true;
  const isWrong = wasAnswered && !isCorrect;
  const isSkipped = !wasAnswered;

  return (
    <div
      className={`border rounded-lg p-4 space-y-3 ${
        isCorrect
          ? 'border-success'
          : isWrong
            ? 'border-destructive/30'
            : 'border-muted-foreground/20'
      }`}
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='flex items-start gap-2 min-w-0 flex-1'>
          {isCorrect ? (
            <CheckCircle2 className='w-4 h-4 text-success mt-0.5 shrink-0' />
          ) : (
            <XCircle
              className={`w-4 h-4 mt-0.5 shrink-0 ${
                isSkipped ? 'text-muted-foreground' : 'text-destructive'
              }`}
            />
          )}
          <div className='min-w-0'>
            <p className='font-medium'>
              {index + 1}. {q.question_text}
            </p>
          </div>
        </div>
        <Badge variant='outline' className='shrink-0 tabular-nums'>
          {earned.toFixed(1)} / {q.points} pt
        </Badge>
      </div>

      {q.question_type === 'SHORT_ANSWER' ? (
        <div className='space-y-2 pl-6'>
          <div className='select-text border rounded p-2 text-sm bg-muted/30 whitespace-pre-wrap'>
            {ans?.text_answer?.trim() || (
              <span className='italic text-muted-foreground'>— no answer —</span>
            )}
          </div>
          {ans?.is_correct == null && (
            <p className='text-[11px] text-muted-foreground'>Pending teacher review.</p>
          )}
        </div>
      ) : (
        <ul className='space-y-1.5 pl-6'>
          {q.options.map((o) => {
            const isSelected = ans?.selected_option_id === o.id;
            const isAnswerKey = !!o.is_correct;
            return (
              <li
                key={o.id}
                className={`flex items-start gap-2 text-sm rounded p-1.5 ${
                  isAnswerKey
                    ? 'bg-success-muted'
                    : isSelected
                      ? 'bg-destructive/5'
                      : ''
                }`}
              >
                <span className='mt-0.5 shrink-0'>
                  {isAnswerKey ? (
                    <CheckCircle2 className='w-3.5 h-3.5 text-success' />
                  ) : isSelected ? (
                    <XCircle className='w-3.5 h-3.5 text-destructive' />
                  ) : (
                    <span className='inline-block w-3.5 h-3.5 rounded-full border border-muted-foreground/30' />
                  )}
                </span>
                <span className='flex-1'>{o.option_text}</span>
                {isSelected && (
                  <Badge variant='outline' className='text-[9px] shrink-0 self-center'>
                    Your answer
                  </Badge>
                )}
                {isAnswerKey && !isSelected && (
                  <Badge
                    variant='outline'
                    className='text-[9px] shrink-0 self-center text-success'
                  >
                    Correct
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {q.explanation && (
        <div className='ml-6 rounded-md border border-warning bg-warning-muted p-3 flex gap-2'>
          <Lightbulb className='w-4 h-4 text-warning shrink-0 mt-0.5' />
          <div>
            <p className='text-[11px] font-medium text-warning-foreground uppercase tracking-wide mb-1'>
              Why?
            </p>
            <p className='select-text text-xs text-warning-foreground whitespace-pre-wrap'>
              {q.explanation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
