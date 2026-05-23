'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  ArrowLeft,
  BookOpen,
  Check,
  ClipboardList,
  Clock,
  CloudOff,
  Library,
  Loader2,
  Pencil,
  Plus,
  Settings,
  Trash2
} from 'lucide-react';
import { QuizBuilder } from './quiz-builder';
import { QuizSettingsDialog } from './quiz-settings-form';
import { QuestionBankManager } from './question-bank-manager';
import { AttemptReview } from './attempt-review';
import { AttemptGrader } from './attempt-grader';
import { EmptyState } from './_shared/empty-state';
import { ListSkeleton } from './_shared/list-skeleton';
import { useDeleteWithUndo } from './_shared/use-delete-with-undo';
import { useQueryClient } from '@/lib/async-query';
import { deleteQuiz as deleteQuizCall } from './../api/quizzes-service';
import { quizKeys } from '../api/quizzes-queries';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  useAvailableQuizzes,
  useCreateQuiz,
  useDeleteQuiz,
  useQuizAttempts,
  useQuizzes,
  useSaveAttemptAnswers,
  useStartQuiz,
  useSubmitQuiz,
  useUpdateQuiz
} from '../api/quizzes-queries';
import { useModules } from '../api/resources-queries';
import type { CourseModule } from '../api/resources-types';
import type {
  CreateQuizInput,
  Quiz,
  QuizAttempt,
  QuizAttemptAnswer,
  QuizStartResponse,
  UpdateQuizInput
} from '../api/quizzes-types';

interface CourseQuizzesProps {
  courseId: string;
  isStudent?: boolean;
}

function formatSeconds(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

/// How long to wait after the last answer change before autosaving. 1.5s is
/// long enough that quickly clicking through MCQ options coalesces into a
/// single round-trip, short enough that closing the tab loses at most ~2s.
const AUTOSAVE_DEBOUNCE_MS = 1500;

/// Build a list of `[module, quizzes]` buckets in the order modules want to
/// render: by `position` ascending, with the Ungrouped bucket last. Empty
/// modules are omitted so the teacher doesn't see a wall of empty headers
/// when most chapters are placeholder. Ungrouped is always rendered if it
/// has rows (even on the student side — never as a placeholder).
function groupQuizzesByModule(
  quizzes: Quiz[],
  modules: CourseModule[]
): Array<{ module: CourseModule | null; quizzes: Quiz[] }> {
  const byId = new Map<number | 'none', Quiz[]>();
  for (const q of quizzes) {
    const key: number | 'none' = q.moduleId ?? 'none';
    const list = byId.get(key) ?? [];
    list.push(q);
    byId.set(key, list);
  }
  const buckets: Array<{ module: CourseModule | null; quizzes: Quiz[] }> = [];
  for (const m of [...modules].sort((a, b) => a.position - b.position)) {
    const rows = byId.get(m.id);
    if (rows && rows.length > 0) buckets.push({ module: m, quizzes: rows });
  }
  const orphan = byId.get('none');
  if (orphan && orphan.length > 0) buckets.push({ module: null, quizzes: orphan });
  return buckets;
}

function StudentAttempt({
  data,
  onSubmitted
}: {
  data: QuizStartResponse;
  /// Receives the finalized attempt (with quiz + answers populated) so the
  /// parent can swap in the review screen without a follow-up request.
  onSubmitted: (attempt: QuizAttempt) => void;
}) {
  const submitMutation = useSubmitQuiz();
  const saveMutation = useSaveAttemptAnswers();

  // Rehydrate from server. On a fresh start `data.savedAnswers` is []. On
  // resume (refresh / re-open) the server returns the answers persisted by
  // the previous tab's autosave so the page restores its exact state.
  const [answers, setAnswers] = useState<Record<number, QuizAttemptAnswer>>(() => {
    const seed: Record<number, QuizAttemptAnswer> = {};
    for (const a of data.savedAnswers ?? []) {
      seed[a.questionId] = {
        questionId: a.questionId,
        selected_option_id: a.selected_option_id ?? undefined,
        text_answer: a.text_answer ?? undefined,
      };
    }
    return seed;
  });

  // Server-authoritative timer. We compute remaining seconds from the diff
  // between `expires_at` (UTC ISO) and `Date.now()` on every tick so:
  //   - a refresh restores the EXACT remaining time (no client state drift)
  //   - clock skew between client and server only matters at start, not
  //     across the whole attempt (the server stamped `expires_at`, the
  //     server-side cron will auto-submit at that exact time regardless)
  //   - tab throttling / sleep can't make the countdown "run slow"
  const expiresAtMs = data.attempt.expires_at
    ? new Date(data.attempt.expires_at).getTime()
    : Date.now() + data.quiz.duration_minutes * 60_000; // legacy fallback
  const computeRemaining = () => Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
  const [remaining, setRemaining] = useState(computeRemaining);

  useEffect(() => {
    const id = setInterval(() => setRemaining(computeRemaining()), 1000);
    return () => clearInterval(id);
    // expiresAtMs is captured per-attempt; we intentionally don't add it as a
    // dep — re-running this effect would reset the interval mid-second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Autosave: debounced after every answer change ─────────────────────────
  // We track `dirty` so a successful save can clear it; if the student keeps
  // typing while a save is in flight, the next debounce kicks off another.
  // The local `saveErrored` flag mirrors what react-query's `isError` would
  // give us — our minimal `useMutation` only exposes mutate/isPending.
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [saveErrored, setSaveErrored] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushSave = (payload: QuizAttemptAnswer[]) => {
    saveMutation.mutate(
      { attemptId: data.attempt.id, answers: payload },
      {
        onSuccess: () => {
          setDirty(false);
          setSaveErrored(false);
          setLastSavedAt(Date.now());
        },
        onError: () => {
          // Stay dirty so the next debounce retries. Surface a discreet hint
          // in the timer bar so the student knows their work isn't safe.
          setSaveErrored(true);
        }
      }
    );
  };

  useEffect(() => {
    if (!dirty) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      flushSave(Object.values(answers));
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // We intentionally exclude flushSave / saveMutation from deps — only the
    // contents of `answers` (which is what made us dirty) should trigger a
    // new debounce schedule.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, dirty]);

  // Wrap setAnswers so every mutation also flags dirty. Components elsewhere
  // can call this freely; the autosave effect will pick up the change.
  const updateAnswer = (questionId: number, patch: Partial<QuizAttemptAnswer>) => {
    setAnswers((a) => {
      const prev = a[questionId] ?? { questionId };
      return { ...a, [questionId]: { ...prev, ...patch, questionId } };
    });
    setDirty(true);
  };

  const handleSubmit = (auto = false) => {
    // Cancel any pending autosave — submit's body is authoritative.
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const payload = Object.values(answers);
    submitMutation.mutate(
      { quizId: data.quiz.id, attemptId: data.attempt.id, answers: payload },
      {
        onSuccess: (a) => {
          // Quiet toast — the review screen is the real feedback surface now.
          if (auto) toast.message('Time up — submitted');
          onSubmitted(a);
        },
        onError: (e: Error) => toast.error(e.message)
      }
    );
  };

  useEffect(() => {
    if (remaining === 0 && !submitMutation.isPending) {
      handleSubmit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  // Render the autosave status pill. Three states: saving, saved-recently,
  // offline. We don't show anything before the first save fires — saves
  // happen automatically and the student doesn't need reassurance about
  // state they never touched.
  const saveStatus = (() => {
    if (saveMutation.isPending) {
      return { icon: Loader2, text: 'Saving…', tone: 'text-muted-foreground', spin: true };
    }
    if (saveErrored) {
      return { icon: CloudOff, text: "Couldn't save — will retry", tone: 'text-destructive', spin: false };
    }
    if (lastSavedAt != null) {
      const secs = Math.max(1, Math.floor((Date.now() - lastSavedAt) / 1000));
      return {
        icon: Check,
        text: secs < 5 ? 'Saved' : `Saved ${secs}s ago`,
        tone: 'text-emerald-600 dark:text-emerald-400',
        spin: false
      };
    }
    return null;
  })();

  // Progress: how many of the rendered questions have a non-empty answer.
  // Drives both the visual progress bar and the "X of Y answered" label.
  const answeredCount = data.questions.reduce((n, q) => {
    const a = answers[q.id];
    const hasAnswer =
      (a?.selected_option_id ?? null) !== null ||
      (a?.text_answer != null && a.text_answer.trim() !== '');
    return n + (hasAnswer ? 1 : 0);
  }, 0);
  const progressPct =
    data.questions.length > 0 ? (answeredCount / data.questions.length) * 100 : 0;

  // Visual urgency for the timer. < 60s shouts in destructive; < 5 min hints
  // in amber; otherwise the muted default.
  const timerTone =
    remaining < 60
      ? 'text-destructive font-bold'
      : remaining < 300
        ? 'text-amber-600 dark:text-amber-400 font-semibold'
        : 'text-foreground';

  return (
    <div className='space-y-4'>
      {/* Sticky header — timer + autosave + progress all stay visible as the
          student scrolls through long quizzes. `sticky top-0` requires the
          parent scroll context which Next layouts provide. */}
      <div className='sticky top-0 z-10 -mx-1 px-1 pt-1 pb-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70'>
        <div className='border rounded-xl p-3 shadow-sm bg-card'>
          <div className='flex items-center justify-between gap-3'>
            <div className='min-w-0'>
              <p className='font-medium truncate'>{data.quiz.title}</p>
              <p className='text-[11px] text-muted-foreground tabular-nums'>
                {answeredCount} of {data.questions.length} answered
              </p>
            </div>
            <div className='flex items-center gap-2 shrink-0'>
              {saveStatus && (
                <p
                  className={`text-[11px] hidden sm:flex items-center gap-1 ${saveStatus.tone}`}
                  role='status'
                  aria-live='polite'
                >
                  <saveStatus.icon
                    className={`w-3 h-3 ${saveStatus.spin ? 'animate-spin' : ''}`}
                  />
                  {saveStatus.text}
                </p>
              )}
              <div
                className={`flex items-center gap-1.5 text-sm tabular-nums ${timerTone}`}
                role='timer'
                aria-live={remaining < 60 ? 'assertive' : 'off'}
              >
                <Clock className='w-4 h-4' />
                <span>{formatSeconds(remaining)}</span>
              </div>
            </div>
          </div>
          {/* Slim progress bar — uses tailwind's color tokens so it adapts
              cleanly to dark mode + brand themes. */}
          <div className='mt-2 h-1 rounded-full overflow-hidden bg-muted'>
            <div
              className='h-full bg-primary transition-[width] duration-300 ease-out'
              style={{ width: `${progressPct}%` }}
              aria-hidden
            />
          </div>
        </div>
      </div>

      {data.questions.map((q, i) => {
        const a = answers[q.id];
        const isAnswered =
          (a?.selected_option_id ?? null) !== null ||
          (a?.text_answer != null && a.text_answer.trim() !== '');
        return (
          <div
            key={q.id}
            className={`border rounded-xl p-4 space-y-3 transition-colors ${
              isAnswered ? 'border-primary/30 bg-primary/[0.02]' : ''
            }`}
          >
            <div className='flex items-start justify-between gap-2'>
              <p className='font-medium leading-snug'>
                <span className='text-muted-foreground tabular-nums mr-1'>{i + 1}.</span>
                {q.question_text}
              </p>
              <Badge variant='outline' className='tabular-nums shrink-0'>
                {q.points} pt
              </Badge>
            </div>
            {q.question_type === 'SHORT_ANSWER' ? (
              <Textarea
                rows={3}
                placeholder='Type your answer…'
                value={a?.text_answer ?? ''}
                onChange={(e) =>
                  updateAnswer(q.id, {
                    text_answer: e.target.value,
                    selected_option_id: null
                  })
                }
              />
            ) : (
              <div className='space-y-1'>
                {q.options.map((o, optIdx) => {
                  const isSelected = a?.selected_option_id === o.id;
                  return (
                    <label
                      key={o.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent hover:bg-muted/40'
                      }`}
                    >
                      <input
                        type='radio'
                        name={`q-${q.id}`}
                        checked={isSelected}
                        onChange={() =>
                          updateAnswer(q.id, {
                            selected_option_id: o.id,
                            text_answer: null
                          })
                        }
                        className='shrink-0'
                      />
                      <span
                        className='text-[10px] font-medium text-muted-foreground tabular-nums w-4 shrink-0'
                        aria-hidden
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className='text-sm flex-1'>{o.option_text}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className='flex items-center justify-between gap-3 border-t pt-4'>
        <p className='text-xs text-muted-foreground tabular-nums'>
          {answeredCount === data.questions.length
            ? 'All questions answered.'
            : `${data.questions.length - answeredCount} unanswered`}
        </p>
        <Button
          onClick={() => handleSubmit(false)}
          disabled={submitMutation.isPending}
          size='lg'
        >
          {submitMutation.isPending ? 'Submitting…' : 'Submit attempt'}
        </Button>
      </div>
    </div>
  );
}

function StudentView({ courseId }: { courseId: string }) {
  const { data: quizzes = [], isLoading } = useAvailableQuizzes(courseId);
  // Students also see the chapter grouping — keeps the experience aligned
  // with the Resources tab and lets them find "the Week 3 quiz" intuitively.
  const { data: modules = [] } = useModules(courseId);
  const startMutation = useStartQuiz();
  const [attempt, setAttempt] = useState<QuizStartResponse | null>(null);
  // After submit we hold onto the finalized attempt so the student gets a
  // full review screen instead of bouncing back to the list with a toast.
  const [review, setReview] = useState<QuizAttempt | null>(null);

  if (review) {
    return (
      <AttemptReview
        attempt={review}
        onBack={() => {
          setReview(null);
          setAttempt(null);
        }}
      />
    );
  }

  if (attempt) {
    return (
      <div className='space-y-3'>
        <Button variant='ghost' onClick={() => setAttempt(null)} className='gap-1'>
          <ArrowLeft className='w-4 h-4' /> Back
        </Button>
        <StudentAttempt
          data={attempt}
          onSubmitted={(finalized) => {
            setAttempt(null);
            setReview(finalized);
          }}
        />
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
    return (
      <div
        key={q.id}
        className='group border rounded-xl p-4 flex items-center justify-between gap-4 transition-colors hover:bg-muted/30'
      >
        <div className='min-w-0 flex-1 space-y-1.5'>
          <div className='flex items-center gap-2 flex-wrap'>
            <ClipboardList className='w-4 h-4 text-muted-foreground shrink-0' />
            <p className='font-medium truncate'>{q.title}</p>
            {closingSoon && (
              <Badge variant='destructive' className='gap-1 text-[10px]'>
                <Clock className='w-3 h-3' />
                Closes soon
              </Badge>
            )}
          </div>
          {q.description && (
            <p className='text-sm text-muted-foreground line-clamp-2'>{q.description}</p>
          )}
          <div className='flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums'>
            <span className='inline-flex items-center gap-1'>
              <Clock className='w-3 h-3' />
              {q.duration_minutes} min
            </span>
            <span aria-hidden>·</span>
            <span>{q.questions?.length ?? 0} questions</span>
            <span aria-hidden>·</span>
            <span>pass ≥ {q.passing_score}%</span>
          </div>
        </div>
        <Button
          size='sm'
          className='shrink-0 transition-transform group-hover:translate-x-0.5'
          onClick={() =>
            startMutation.mutate(q.id, {
              onSuccess: (data) => setAttempt(data),
              onError: (e: Error) => toast.error(e.message)
            })
          }
          disabled={startMutation.isPending}
        >
          Start
        </Button>
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
            <h4 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
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

function TeacherAttemptsPanel({
  quiz,
  courseId,
  onBack
}: {
  quiz: Quiz;
  courseId: string;
  onBack: () => void;
}) {
  const { data: attempts = [], isLoading } = useQuizAttempts(quiz.id);
  const [grading, setGrading] = useState<QuizAttempt | null>(null);

  // The grader fetches `attempt.answers` from this same list query — when
  // useGradeAttempt invalidates the list after save, the new row replaces
  // the stale prop here so the grader rehydrates with the latest grades.
  const liveGrading = grading
    ? attempts.find((a) => a.id === grading.id) ?? grading
    : null;

  if (liveGrading) {
    return (
      <AttemptGrader
        attempt={liveGrading}
        courseOfferingId={courseId}
        quizId={quiz.id}
        onBack={() => setGrading(null)}
      />
    );
  }

  /// An attempt "needs grading" iff at least one short-answer row hasn't
  /// been scored (is_correct is null). MCQ-only quizzes never enter this
  /// state because they're scored at submit time.
  const needsGrading = (a: QuizAttempt) =>
    (a.answers ?? []).some(
      (ans) => ans.question?.question_type === 'SHORT_ANSWER' && ans.is_correct == null
    );

  const pendingCount = attempts.filter(needsGrading).length;

  return (
    <div className='space-y-3'>
      <Button variant='ghost' onClick={onBack} className='gap-1'>
        <ArrowLeft className='w-4 h-4' /> Back
      </Button>
      <div className='flex items-center gap-2 flex-wrap'>
        <h3 className='font-bold text-lg'>{quiz.title} — attempts</h3>
        {pendingCount > 0 && (
          <Badge variant='destructive'>{pendingCount} need grading</Badge>
        )}
      </div>
      {isLoading && <ListSkeleton variant='row' count={3} />}
      <div className='border rounded-lg overflow-hidden'>
        <Table>
          <TableHeader className='bg-muted/30'>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className='text-right'>Score</TableHead>
              <TableHead className='w-px' />
            </TableRow>
          </TableHeader>
          <TableBody>
            {attempts.map((a) => {
              const pending = needsGrading(a);
              const isAutoSubmit = a.closure_reason === 'time_expired';
              return (
                <TableRow
                  key={a.id}
                  className='cursor-pointer hover:bg-muted/30'
                  onClick={() => setGrading(a)}
                >
                  <TableCell>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <span>{a.student?.full_name ?? `#${a.studentId}`}</span>
                      {isAutoSubmit && (
                        <Badge variant='outline' className='text-[10px]'>
                          Auto-submitted
                        </Badge>
                      )}
                      {pending && (
                        <Badge variant='destructive' className='text-[10px]'>
                          Needs grading
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {a.submitted_at ? format(new Date(a.submitted_at), 'MMM d, h:mm a') : '—'}
                  </TableCell>
                  <TableCell className='text-right tabular-nums'>
                    {a.score != null ? `${Math.round(a.score)}%` : '—'}
                  </TableCell>
                  <TableCell className='text-right pr-2'>
                    <Button variant='ghost' size='sm'>
                      {pending ? 'Grade' : 'Review'}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {!isLoading && attempts.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className='text-center text-sm text-muted-foreground py-8'>
                  No attempts yet. Students who submit will appear here.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function TeacherView({ courseId }: { courseId: string }) {
  const { data: quizzes = [], isLoading } = useQuizzes(courseId);
  // Pulled separately so the Settings dialog can offer the chapter picker
  // and the list view can group by chapter. Cheap query — same one Resources
  // already runs, so React Query will dedupe.
  const { data: modules = [] } = useModules(courseId);
  const createMutation = useCreateQuiz(courseId);
  const updateMutation = useUpdateQuiz(courseId);
  const queryClient = useQueryClient();
  const { run: runDelete } = useDeleteWithUndo();

  const undoDeleteQuiz = (quiz: Quiz) => {
    const key = quizKeys.list(courseId);
    const snapshot = queryClient.getQueryData<Quiz[]>(key);
    if (!snapshot) return;
    runDelete({
      label: `Quiz deleted · "${quiz.title}"`,
      optimisticallyRemove: () => {
        queryClient.setQueryData<Quiz[]>(key, (prev) =>
          (prev ?? []).filter((q) => q.id !== quiz.id)
        );
      },
      restore: () => queryClient.setQueryData<Quiz[]>(key, () => snapshot),
      commit: () => deleteQuizCall(quiz.id)
    });
  };

  // Three modal/page states are mutually exclusive:
  //   - settingsTarget: settings dialog (null=closed, "create" sentinel for
  //     new quiz, or an existing Quiz row for edit)
  //   - editingQuestions: switches the screen to the QuizBuilder
  //   - viewingAttempts:  switches the screen to TeacherAttemptsPanel
  const [settingsTarget, setSettingsTarget] = useState<Quiz | 'create' | null>(null);
  const [editingQuestions, setEditingQuestions] = useState<Quiz | null>(null);
  const [viewingAttempts, setViewingAttempts] = useState<Quiz | null>(null);
  // Reusable question bank manager — opens from a header button.
  const [bankOpen, setBankOpen] = useState(false);

  const sorted = useMemo(
    () => [...quizzes].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    [quizzes]
  );

  // Quizzes grouped by chapter. Within each chapter we keep the
  // created_at-desc order from `sorted`; chapter order follows module.position
  // so it matches what the teacher sees on the Resources tab.
  const groups = useMemo(
    () => groupQuizzesByModule(sorted, modules),
    [sorted, modules]
  );
  const showGrouped = groups.length > 1 || (groups[0]?.module ?? null) !== null;

  // Keep the QuizBuilder's prop in sync with the cached list — after adding
  // a question, the list refetches and we want the builder to see the new
  // question without losing its `editingQuestions` state.
  const liveEditingQuestions = editingQuestions
    ? quizzes.find((q) => q.id === editingQuestions.id) ?? editingQuestions
    : null;
  // Same idea for the settings dialog — if `_count.attempts` changes between
  // opens, we want the latest value in the warning banner.
  const liveSettingsTarget =
    settingsTarget && settingsTarget !== 'create'
      ? quizzes.find((q) => q.id === settingsTarget.id) ?? settingsTarget
      : settingsTarget;

  if (liveEditingQuestions) {
    return (
      <QuizBuilder
        courseId={courseId}
        quiz={liveEditingQuestions}
        onBack={() => setEditingQuestions(null)}
      />
    );
  }

  if (viewingAttempts) {
    return (
      <TeacherAttemptsPanel
        quiz={viewingAttempts}
        courseId={courseId}
        onBack={() => setViewingAttempts(null)}
      />
    );
  }

  const handleSettingsSubmit = (
    payload:
      | { mode: 'create'; data: CreateQuizInput }
      | { mode: 'edit'; quizId: number; data: UpdateQuizInput }
  ) => {
    if (payload.mode === 'create') {
      createMutation.mutate(payload.data, {
        onSuccess: () => {
          toast.success('Quiz created');
          setSettingsTarget(null);
        },
        onError: (e: Error) => toast.error(e.message),
      });
    } else {
      updateMutation.mutate(
        { quizId: payload.quizId, input: payload.data },
        {
          onSuccess: () => {
            toast.success('Quiz updated');
            setSettingsTarget(null);
          },
          onError: (e: Error) => toast.error(e.message),
        }
      );
    }
  };

  return (
    <div className='space-y-4'>
      <div className='flex justify-between items-center gap-2 flex-wrap'>
        <p className='text-sm text-muted-foreground tabular-nums'>
          {sorted.length} {sorted.length === 1 ? 'quiz' : 'quizzes'}
        </p>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            onClick={() => setBankOpen(true)}
            className='gap-1'
          >
            <Library className='w-4 h-4' /> Question Bank
          </Button>
          <Button onClick={() => setSettingsTarget('create')} className='gap-1'>
            <Plus className='w-4 h-4' /> New quiz
          </Button>
        </div>
      </div>

      {isLoading && <ListSkeleton variant='row' count={2} />}
      {!isLoading && sorted.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title='No quizzes yet'
          description='Create a quiz, add MCQ / True-False / Short-answer questions, then publish it.'
          actionLabel='New quiz'
          onAction={() => setSettingsTarget('create')}
        />
      )}

      {/* Quiz cards, optionally grouped under chapter headers. When the
          offering has no modules, or no quiz is filed under one, we fall
          back to a flat list so we don't render a useless single header. */}
      {showGrouped ? (
        <div className='space-y-5'>
          {groups.map(({ module: mod, quizzes: qs }) => (
            <section key={mod?.id ?? 'ungrouped'} className='space-y-2'>
              <header className='flex items-center gap-2 pl-1'>
                <BookOpen className='w-3.5 h-3.5 text-muted-foreground' />
                <h4 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                  {mod ? mod.title : 'Ungrouped'}
                </h4>
                {mod && !mod.publishedAt && (
                  <Badge variant='outline' className='text-[10px]'>
                    Draft chapter
                  </Badge>
                )}
                <span className='text-[11px] text-muted-foreground tabular-nums ml-1'>
                  {qs.length}
                </span>
              </header>
              <div className='space-y-2'>
                {qs.map((q) => (
                  <TeacherQuizCard
                    key={q.id}
                    quiz={q}
                    onSettings={() => setSettingsTarget(q)}
                    onEditQuestions={() => setEditingQuestions(q)}
                    onViewAttempts={() => setViewingAttempts(q)}
                    onDelete={() => undoDeleteQuiz(q)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className='space-y-2'>
          {sorted.map((q) => (
            <TeacherQuizCard
              key={q.id}
              quiz={q}
              onSettings={() => setSettingsTarget(q)}
              onEditQuestions={() => setEditingQuestions(q)}
              onViewAttempts={() => setViewingAttempts(q)}
              onDelete={() => undoDeleteQuiz(q)}
            />
          ))}
        </div>
      )}

      <QuizSettingsDialog
        open={settingsTarget !== null}
        onOpenChange={(open) => !open && setSettingsTarget(null)}
        editing={
          liveSettingsTarget && liveSettingsTarget !== 'create'
            ? liveSettingsTarget
            : null
        }
        pending={createMutation.isPending || updateMutation.isPending}
        modules={modules}
        onSubmit={handleSettingsSubmit}
      />

      <QuestionBankManager
        open={bankOpen}
        onOpenChange={setBankOpen}
        courseOfferingId={courseId}
      />
    </div>
  );
}

/// Single quiz row in the teacher list. Extracted so both the grouped and
/// flat-list code paths render identically and a future tweak doesn't need
/// to be done twice. The card itself is unchanged from the pre-grouping
/// version — same badges, same action buttons, same hover affordance.
function TeacherQuizCard({
  quiz: q,
  onSettings,
  onEditQuestions,
  onViewAttempts,
  onDelete
}: {
  quiz: Quiz;
  onSettings: () => void;
  onEditQuestions: () => void;
  onViewAttempts: () => void;
  onDelete: () => void;
}) {
  const now = Date.now();
  const openMs = q.open_at ? new Date(q.open_at).getTime() : null;
  const closeMs = q.close_at ? new Date(q.close_at).getTime() : null;
  const windowState: 'scheduled' | 'open' | 'closed' | null =
    openMs && now < openMs
      ? 'scheduled'
      : closeMs && now > closeMs
        ? 'closed'
        : openMs || closeMs
          ? 'open'
          : null;
  const questionCount = q.questions?.length ?? 0;
  return (
    <div className='group border rounded-xl p-4 flex items-center justify-between gap-3 transition-colors hover:bg-muted/30 focus-within:ring-2 focus-within:ring-primary/40'>
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-2 flex-wrap'>
          <ClipboardList className='w-4 h-4 text-muted-foreground shrink-0' />
          <p className='font-medium truncate'>{q.title}</p>
          {q.is_draft && <Badge variant='secondary'>Draft</Badge>}
          {windowState === 'scheduled' && (
            <Badge variant='outline' className='text-[10px]'>
              Scheduled
            </Badge>
          )}
          {windowState === 'closed' && (
            <Badge variant='destructive' className='text-[10px]'>
              Closed
            </Badge>
          )}
          {windowState === 'open' && (
            <Badge
              variant='outline'
              className='text-[10px] text-emerald-700 dark:text-emerald-400 border-emerald-300/50'
            >
              Open
            </Badge>
          )}
          {q.shuffle_questions && (
            <Badge variant='outline' className='text-[10px]'>
              Shuffle Q
            </Badge>
          )}
          {q.timing_mode === 'fixed' && (
            <Badge variant='outline' className='text-[10px]'>
              Fixed window
            </Badge>
          )}
        </div>
        <p className='text-xs text-muted-foreground mt-1 tabular-nums'>
          {q.duration_minutes} min · pass ≥ {q.passing_score}% · {q.max_attempts}{' '}
          attempt{q.max_attempts === 1 ? '' : 's'} · {questionCount} question
          {questionCount === 1 ? '' : 's'} · {q._count?.attempts ?? 0} submitted
        </p>
      </div>
      <div className='flex gap-1.5 shrink-0'>
        <Button
          variant='outline'
          size='sm'
          className='gap-1'
          onClick={onSettings}
          aria-label={`Settings for ${q.title}`}
        >
          <Settings className='w-3.5 h-3.5' /> Settings
        </Button>
        <Button
          variant='outline'
          size='sm'
          className='gap-1'
          onClick={onEditQuestions}
          aria-label={`Edit questions on ${q.title}`}
        >
          <Pencil className='w-3.5 h-3.5' /> Questions
        </Button>
        <Button
          variant='outline'
          size='sm'
          onClick={onViewAttempts}
          aria-label={`View attempts on ${q.title}`}
        >
          Attempts
        </Button>
        <Button
          variant='ghost'
          size='icon'
          className='text-destructive opacity-60 group-hover:opacity-100 transition-opacity'
          onClick={onDelete}
          aria-label={`Delete ${q.title}`}
        >
          <Trash2 className='w-4 h-4' />
        </Button>
      </div>
    </div>
  );
}

export function CourseQuizzes({ courseId, isStudent }: CourseQuizzesProps) {
  return isStudent ? <StudentView courseId={courseId} /> : <TeacherView courseId={courseId} />;
}
