'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Award,
  BookOpen,
  Check,
  ClipboardList,
  Clock,
  Eye,
  Loader2,
  PlayCircle,
  XCircle
} from 'lucide-react';
import { AttemptReview } from './attempt-review';
import { StudentAttempt } from './student-quiz-attempt';
import { EmptyState } from './_shared/empty-state';
import { ListSkeleton } from './_shared/list-skeleton';
import { groupQuizzesByModule } from './course-quizzes-utils';
import { useQueryClient } from '@/lib/async-query';
import { getAttemptReview } from '../api/quizzes-service';
import { quizKeys, useAvailableQuizzes, useStartQuiz } from '../api/quizzes-queries';
import { useModules } from '../api/resources-queries';
import { toast } from 'sonner';
import type { Quiz, QuizAttempt, QuizStartResponse } from '../api/quizzes-types';

export function StudentView({ courseId }: { courseId: string }) {
  const { data: quizzes = [], isLoading } = useAvailableQuizzes(courseId);
  // Students also see the chapter grouping — keeps the experience aligned
  // with the Resources tab and lets them find "the Week 3 quiz" intuitively.
  const { data: modules = [] } = useModules(courseId);
  const queryClient = useQueryClient();
  const startMutation = useStartQuiz();
  const [attempt, setAttempt] = useState<QuizStartResponse | null>(null);
  // After submit we hold onto the finalized attempt so the student gets a
  // full review screen instead of bouncing back to the list with a toast.
  const [review, setReview] = useState<QuizAttempt | null>(null);
  // Submit success overlay. Stays up ~1.4s before the review screen mounts —
  // long enough to feel like an acknowledgement, short enough not to annoy.
  const [submittedAnim, setSubmittedAnim] = useState<QuizAttempt | null>(null);
  // Timeout modal — set when an auto-submitted attempt lands. Cleared by
  // the student clicking "See results".
  const [timedOutAttempt, setTimedOutAttempt] = useState<QuizAttempt | null>(null);
  // Set to the attempt id currently being fetched for re-review (the student
  // clicked "Results" on a card). Drives the per-card spinner so two cards
  // don't both show loading.
  const [reviewLoadingId, setReviewLoadingId] = useState<number | null>(null);

  // Re-open the full per-question review for an already-submitted attempt.
  // The card only carries summary data (Last / Best %), so we fetch the full
  // attempt (quiz tree + answers) on demand and hand it to <AttemptReview>.
  const openResults = async (attemptId: number) => {
    setReviewLoadingId(attemptId);
    try {
      const full = await getAttemptReview(attemptId);
      setReview(full);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load your results');
    } finally {
      setReviewLoadingId(null);
    }
  };

  if (review) {
    return (
      <>
        <AttemptReview
          attempt={review}
          onBack={() => {
            setReview(null);
            setAttempt(null);
          }}
        />
        {/* If the attempt landed via auto-submit, show a modal on top of
            the review screen so the student understands what happened. */}
        <AlertDialog
          open={!!timedOutAttempt}
          onOpenChange={(v) => !v && setTimedOutAttempt(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className='flex items-center gap-2'>
                <Clock className='w-5 h-5 text-warning' />
                Time&apos;s up — we submitted for you
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className='space-y-2 text-sm'>
                  <p>
                    The timer ran out, so we submitted whatever you had
                    answered. Anything you typed in the last 1–2 seconds may
                    not have made it.
                  </p>
                  <p className='text-muted-foreground'>
                    Your score and the answer review are ready below.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setTimedOutAttempt(null)}>
                See results
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  if (attempt) {
    return (
      <div className='space-y-3'>
        <StudentAttempt
          data={attempt}
          onBack={() => {
            // Flush happens inside StudentAttempt.handleBack before this
            // callback fires. We clear local state then force a fresh fetch
            // so the quiz card reflects the current in-progress attempt
            // (timer, saved-answer count) rather than the stale snapshot
            // we have from when the student first opened the tab.
            setAttempt(null);
            queryClient.invalidateQueries({ queryKey: quizKeys.available(courseId) });
          }}
          onSubmitted={(finalized) => {
            // Brief celebratory overlay, then swap to review. We snapshot
            // the closure reason now because once review is up, the user
            // could nav away before the auto-submit modal had a chance to
            // queue.
            setSubmittedAnim(finalized);
            setTimeout(() => {
              setAttempt(null);
              setSubmittedAnim(null);
              setReview(finalized);
              // Invalidate so the quiz card clears the stale inProgressAttempt
              // banner immediately when the student returns to the list.
              queryClient.invalidateQueries({ queryKey: quizKeys.available(courseId) });
              if (finalized.closure_reason === 'time_expired') {
                setTimedOutAttempt(finalized);
              }
            }, 1400);
          }}
        />
        {/* Full-screen-ish success overlay — slides up + fades. Pure CSS so
            no animation library needed. Uses the existing `animate-in` /
            `fade-in` utilities from tailwindcss-animate (shadcn default). */}
        {submittedAnim && (
          <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200'
            role='status'
            aria-live='polite'
          >
            <div className='flex flex-col items-center gap-3 animate-in zoom-in-50 fade-in duration-300'>
              <div className='w-16 h-16 rounded-full bg-success-muted flex items-center justify-center ring-4 ring-success/20'>
                <Check className='w-8 h-8 text-success' strokeWidth={3} />
              </div>
              <p className='text-lg font-semibold'>Submitted!</p>
              <p className='text-sm text-muted-foreground'>
                {submittedAnim.score != null
                  ? `Score: ${Math.round(submittedAnim.score)}%`
                  : 'Awaiting grade'}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isLoading) return <ListSkeleton variant='row' count={2} />;
  if (quizzes.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title='No quizzes available'
        description='Quizzes assigned to this course will appear here when they open.'
      />
    );
  }

  const groups = groupQuizzesByModule(quizzes, modules);
  const showGrouped = groups.length > 1 || (groups[0]?.module ?? null) !== null;

  const renderCard = (q: Quiz) => {
    // Hint that the quiz close window is approaching — show within 24h.
    const closesInMs = q.close_at ? new Date(q.close_at).getTime() - Date.now() : null;
    const closingSoon =
      closesInMs !== null && closesInMs > 0 && closesInMs < 24 * 60 * 60 * 1000;

    // Resume affordance: when the backend reports an in-progress attempt for
    // this quiz we swap the Start button for a Continue button and show the
    // remaining minutes inline. The mutation itself is unchanged — the
    // backend `start` endpoint resumes if a row exists, creates if not.
    const inProgress = q.inProgressAttempt ?? null;
    const ipMinutesLeft = inProgress?.expires_at
      ? Math.max(0, Math.floor((new Date(inProgress.expires_at).getTime() - Date.now()) / 60_000))
      : null;

    // "Attempt N of M" badge — only when the teacher allowed multiple attempts.
    const attemptsUsed = q.attemptsUsed ?? 0;
    const showAttempts = q.max_attempts > 1;
    // Whether the student has any attempts left to start a NEW one. An
    // in-progress attempt is always resumable regardless of this. We trust the
    // backend's `attemptsLeft` when present and fall back to deriving it, so an
    // exhausted student sees a disabled "No attempts left" button instead of
    // clicking Start only to eat a backend rejection toast.
    const attemptsLeft = q.attemptsLeft ?? Math.max(0, q.max_attempts - attemptsUsed);
    const exhausted = !inProgress && attemptsLeft <= 0;

    // Previous attempt cues. We surface BOTH the last attempt (because
    // students naturally ask "what did I just score?") and the best score
    // (because students retake to improve and want a target). Pass/fail
    // pill colour mirrors the timer urgency vocabulary on the attempt
    // screen so the meaning is consistent across the tab.
    const last = q.lastAttempt ?? null;
    const best = q.bestScore;
    const lastScoreRounded = last?.score != null ? Math.round(last.score) : null;
    const bestScoreRounded = best != null ? Math.round(best) : null;

    return (
      <div
        key={q.id}
        className='group border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-colors hover:bg-muted/30'
      >
        <div className='min-w-0 flex-1 space-y-1.5'>
          <div className='flex items-center gap-2 flex-wrap'>
            <ClipboardList className='w-4 h-4 text-muted-foreground shrink-0' />
            <p className='font-medium truncate select-none'>{q.title}</p>
            {inProgress && (
              <Badge
                variant='warning'
                size='xs'
                className='gap-1'
              >
                <PlayCircle className='w-3 h-3' />
                In progress
              </Badge>
            )}
            {closingSoon && !inProgress && (
              <Badge variant='destructive' className='gap-1 text-[10px]'>
                <Clock className='w-3 h-3' />
                Closes soon
              </Badge>
            )}
            {showAttempts && (
              <Badge variant='secondary' className='text-[10px] tabular-nums'>
                Attempt {Math.min(attemptsUsed + (inProgress ? 0 : 1), q.max_attempts)} of {q.max_attempts}
              </Badge>
            )}
            {/* Previous-attempt status — only when a submitted attempt
                exists. Pass / fail pill replaces the raw score so the
                visual hierarchy is immediate. Best score sits next to it
                when it's higher than the most recent attempt. */}
            {last && lastScoreRounded != null && (
              <Badge
                variant='outline'
                className={`gap-1 text-[10px] tabular-nums ${
                  last.passed === true
                    ? 'text-success border-success'
                    : last.passed === false
                      ? 'text-destructive border-destructive/40'
                      : 'text-muted-foreground'
                }`}
                title={`Submitted ${new Date(last.submitted_at).toLocaleString()}`}
              >
                {last.passed === true ? (
                  <Check className='w-3 h-3' />
                ) : last.passed === false ? (
                  <XCircle className='w-3 h-3' />
                ) : null}
                Last: {lastScoreRounded}%
              </Badge>
            )}
            {bestScoreRounded != null &&
              lastScoreRounded != null &&
              bestScoreRounded > lastScoreRounded && (
                <Badge
                  variant='warning'
                  size='xs'
                  className='gap-1 tabular-nums'
                  title='Your best score on this quiz so far'
                >
                  <Award className='w-3 h-3' />
                  Best: {bestScoreRounded}%
                </Badge>
              )}
            {last && !last.is_graded && lastScoreRounded == null && (
              <Badge
                variant='outline'
                className='text-[10px] text-muted-foreground'
                title='Waiting on teacher to grade short-answer questions'
              >
                Awaiting grade
              </Badge>
            )}
          </div>
          {q.description && (
            <p className='text-sm text-muted-foreground line-clamp-2'>{q.description}</p>
          )}
          <div className='flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums flex-wrap'>
            <span className='inline-flex items-center gap-1'>
              <Clock className='w-3 h-3' />
              {q.duration_minutes} min
            </span>
            <span aria-hidden>·</span>
            <span>{q.questions?.length ?? 0} questions</span>
            <span aria-hidden>·</span>
            <span>pass ≥ {q.passing_score}%</span>
            {inProgress && ipMinutesLeft !== null && (
              <>
                <span aria-hidden>·</span>
                <span className='text-warning font-medium'>
                  {ipMinutesLeft > 0 ? `${ipMinutesLeft} min left` : 'expiring now'}
                </span>
              </>
            )}
          </div>
        </div>
        <div className='flex items-center gap-2 shrink-0 self-stretch sm:self-auto'>
          {/* View results — re-opens the full per-question review for the
              student's most recent submitted attempt. Shown whenever a
              submitted attempt exists. When the quiz is also exhausted (e.g.
              the single-attempt default), this is the only action, so it
              becomes the primary button; otherwise it sits as a secondary
              outline button next to Start / Retry / Continue. */}
          {last && (
            <Button
              size='sm'
              variant={exhausted && !inProgress ? 'default' : 'outline'}
              className='gap-1'
              onClick={() => openResults(last.id)}
              disabled={reviewLoadingId === last.id}
              aria-label={`View your results for ${q.title}`}
            >
              {reviewLoadingId === last.id ? (
                <Loader2 className='w-4 h-4 animate-spin' />
              ) : (
                <Eye className='w-4 h-4' />
              )}
              Results
            </Button>
          )}
          {/* Hide the disabled "No attempts left" button when there's a
              Results button already carrying the row — a disabled stub next
              to it is just noise. Keep it otherwise so the state is explicit. */}
          {!(exhausted && last && !inProgress) && (
            <Button
              size='sm'
              className={`transition-transform group-hover:translate-x-0.5 ${
                inProgress ? 'gap-1' : ''
              }`}
              onClick={() =>
                startMutation.mutate(q.id, {
                  onSuccess: (data) => setAttempt(data),
                  onError: (e: Error) => toast.error(e.message)
                })
              }
              disabled={
                startMutation.isPending ||
                (q.questions?.length ?? 0) === 0 ||
                exhausted
              }
              aria-label={
                inProgress
                  ? `Continue attempt for ${q.title}`
                  : exhausted
                    ? `No attempts left for ${q.title}`
                    : `Start ${q.title}`
              }
            >
              {(q.questions?.length ?? 0) === 0 ? (
                'Empty quiz'
              ) : inProgress ? (
                <>
                  <PlayCircle className='w-4 h-4' />
                  Continue
                </>
              ) : exhausted ? (
                'No attempts left'
              ) : attemptsUsed > 0 ? (
                'Retry'
              ) : (
                'Start'
              )}
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (!showGrouped) {
    return <div className='space-y-3'>{quizzes.map(renderCard)}</div>;
  }

  return (
    <div className='space-y-5'>
      {groups.map(({ module: mod, quizzes: qs }) => (
        <section key={mod?.id ?? 'ungrouped'} className='space-y-2'>
          <header className='flex items-center gap-2 pl-1'>
            <BookOpen className='w-3.5 h-3.5 text-muted-foreground' />
            <h4 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground select-none'>
              {mod ? mod.title : 'Other'}
            </h4>
            <span className='text-[11px] text-muted-foreground tabular-nums ml-1'>
              {qs.length}
            </span>
          </header>
          <div className='space-y-2'>{qs.map(renderCard)}</div>
        </section>
      ))}
    </div>
  );
}