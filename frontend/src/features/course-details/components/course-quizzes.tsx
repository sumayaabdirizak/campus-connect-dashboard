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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BarChart3,
  BookOpen,
  Check,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  Clock,
  CloudOff,
  Copy,
  Download,
  Eye,
  Keyboard,
  Library,
  Loader2,
  MoreHorizontal,
  Pencil,
  PlayCircle,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Square,
  Trash2,
  Users,
  XCircle
} from 'lucide-react';
import { QuizBuilder } from './quiz-builder';
import { QuizSettingsDialog } from './quiz-settings-form';
import { QuestionBankManager } from './question-bank-manager';
import { AiGenerateDialog } from './ai-generate-dialog';
import { AttemptReview } from './attempt-review';
import { AttemptGrader } from './attempt-grader';
import { QuizLiveMonitor } from './quiz-live-monitor';
import { EmptyState } from './_shared/empty-state';
import { ListSkeleton } from './_shared/list-skeleton';
import { useDeleteWithUndo } from './_shared/use-delete-with-undo';
import { useQueryClient } from '@/lib/async-query';
import { useAuthStore } from '@/lib/auth-store';
import {
  deleteQuiz as deleteQuizCall,
  updateQuiz
} from './../api/quizzes-service';
import { quizKeys } from '../api/quizzes-queries';
import { getAttemptReview } from '../api/quizzes-service';
import {
  enqueueAnswers,
  drainPending,
  getAllPending,
  requestBackgroundSync,
} from '../api/quiz-offline-queue';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  useAvailableQuizzes,
  useCreateQuiz,
  useDeleteQuiz,
  useDuplicateQuiz,
  useQuizAnalytics,
  useQuizAttempts,
  useQuizzes,
  useReportViolation,
  useSaveAttemptAnswers,
  useStartQuiz,
  useSubmitQuiz,
  useUpdateQuiz
} from '../api/quizzes-queries';
import { useModules } from '../api/resources-queries';
import { useRoster } from '../api/roster-queries';
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

/// Used by the beforeunload save path — we can't go through apiClient (it's
/// async, the page is closing) so we read the API base off the same env var
/// the client uses and fire a `keepalive: true` fetch the browser keeps
/// running after navigation. Cookies (httpOnly auth + csrf_token) ride along
/// via `credentials: 'include'`. We read the CSRF token from the cookie
/// directly because apiClient's in-memory cache may not be set yet on a
/// fresh tab and we have no time to await ensureCsrfToken().
const QUIZ_API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function readCsrfCookie(): string {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

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
  onSubmitted,
  onBack,
  previewMode = false,
  onClosePreview
}: {
  data: QuizStartResponse;
  /// Receives the finalized attempt (with quiz + answers populated) so the
  /// parent can swap in the review screen without a follow-up request.
  onSubmitted: (attempt: QuizAttempt) => void;
  /// Called when the student explicitly navigates away mid-attempt. The
  /// component flushes any pending debounced autosave BEFORE invoking this
  /// so the last keystrokes are persisted even if the debounce hadn't fired.
  onBack?: () => void;
  /// Preview-as-student mode for teachers: identical UI, but autosave is
  /// disabled, submit is replaced with "Close preview", multi-tab guard is
  /// off, and timer warnings are suppressed. Lets the teacher click through
  /// the student experience without writing to the DB.
  previewMode?: boolean;
  onClosePreview?: () => void;
}) {
  const submitMutation = useSubmitQuiz();
  const saveMutation = useSaveAttemptAnswers();
  const violationMutation = useReportViolation();
  // Used for the screenshot-deterrent watermark. We display the student's
  // name + attempt ID diagonally across each question card at low opacity so
  // any OS-level screenshot is traceable to this specific attempt.
  const authUser = useAuthStore((s) => s.user);
  const watermarkLabel = `${authUser?.full_name ?? authUser?.name ?? authUser?.email ?? 'Student'} · #${data.attempt.id}`;

  // Rehydrate from server. On a fresh start `data.savedAnswers` is []. On
  // resume (refresh / re-open) the server returns the answers persisted by
  // the previous tab's autosave so the page restores its exact state —
  // INCLUDING the confidence selection on confidence-scored quizzes.
  const [answers, setAnswers] = useState<Record<number, QuizAttemptAnswer>>(() => {
    const seed: Record<number, QuizAttemptAnswer> = {};
    for (const a of data.savedAnswers ?? []) {
      seed[a.questionId] = {
        questionId: a.questionId,
        selected_option_id: a.selected_option_id ?? undefined,
        text_answer: a.text_answer ?? undefined,
        confidence: a.confidence ?? undefined,
      };
    }
    return seed;
  });

  // Confidence scoring is opt-in per quiz. We surface the flag once and
  // pass it through the render — when off, the selector simply doesn't
  // render so non-confidence quizzes are visually identical to before.
  const confidenceScoring = !!data.quiz?.confidence_scoring;

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
  // Offline tracking. `isOffline` reflects the browser's connectivity
  // state; `queuedCount` is how many distinct attempt-payloads are sitting
  // in IndexedDB waiting to drain. Only ever 0 or 1 in practice for a
  // single attempt, but we display the count to be honest with the user.
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [queuedCount, setQueuedCount] = useState(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshQueueCount = async () => {
    try {
      const rows = await getAllPending();
      setQueuedCount(rows.length);
    } catch { /* IDB not available — leave count at 0 */ }
  };

  /// Queue this payload to IndexedDB and register a Background Sync. Used
  /// as the offline fallback when the live network save fails. The SW will
  /// drain it on the next online event even if the tab is closed.
  const queueOffline = async (payload: QuizAttemptAnswer[]) => {
    if (previewMode) return;
    try {
      await enqueueAnswers({
        attemptId: data.attempt.id,
        csrf: readCsrfCookie(),
        body: { answers: payload },
        url: `${QUIZ_API_BASE}/quiz-taking/attempts/${data.attempt.id}/answers`,
        queuedAt: Date.now(),
      });
      void requestBackgroundSync();
      void refreshQueueCount();
    } catch { /* IDB might be disabled in private mode — best effort */ }
  };

  const flushSave = (payload: QuizAttemptAnswer[]) => {
    // Preview mode: pretend we saved so the saveStatus pill renders, but
    // never hit the backend — the attempt id is the teacher's preview row
    // and we don't want to persist their dry-run answers.
    if (previewMode) {
      setDirty(false);
      setLastSavedAt(Date.now());
      return;
    }
    // Already offline? Skip the network call and queue directly — faster
    // and avoids the spinner flashing for nothing.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      void queueOffline(payload);
      setSaveErrored(false);
      return;
    }
    saveMutation.mutate(
      { attemptId: data.attempt.id, answers: payload },
      {
        onSuccess: () => {
          setDirty(false);
          setSaveErrored(false);
          setLastSavedAt(Date.now());
        },
        onError: () => {
          // Fall back to the offline queue. The SW (or the next online
          // event) will replay it. We DON'T flag saveErrored here because
          // the answer isn't truly lost — it's just in flight.
          void queueOffline(payload);
        }
      }
    );
  };

  // Connectivity listeners — drain on online, flag on offline. Also runs
  // a drain pass on mount in case the user resumed an attempt after a
  // prior session crashed mid-queue.
  useEffect(() => {
    if (previewMode) return;
    const onOnline = async () => {
      setIsOffline(false);
      const { failed } = await drainPending();
      await refreshQueueCount();
      if (failed === 0) {
        setSaveErrored(false);
        setLastSavedAt(Date.now());
      }
    };
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    // Initial drain attempt + count refresh.
    void (async () => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        await drainPending();
      }
      await refreshQueueCount();
    })();
    // The service worker posts a message whenever it drains a row so the
    // pill updates without the user touching anything.
    const onSwMessage = (e: MessageEvent) => {
      if (e.data?.type === 'quiz-sync-progress') void refreshQueueCount();
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', onSwMessage);
    }
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', onSwMessage);
      }
    };
  }, [previewMode]);

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

  // Confirm-before-submit dialog state. We never short-circuit on auto-submit
  // (timeout) — at T=0 the server's word is final and we just push the latest
  // answers up. The dialog only guards human-initiated submits.
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  // Keyboard shortcuts overlay (toggled by `?`).
  const [showShortcuts, setShowShortcuts] = useState(false);
  // Index of the currently displayed question (one-at-a-time paging).
  const [currentIdx, setCurrentIdx] = useState(0);

  // Navigate to a question, immediately flushing any pending debounced save
  // first so the answer the student just gave is persisted before the card
  // swaps. Uses the View Transitions API to slide one card out and the next
  // one in — falls back to instant swap on browsers without support
  // (Firefox < 142, older Safari). The transition CSS is defined globally
  // and keyed on `view-transition-name: quiz-question-card`.
  const navigateTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, data.questions.length - 1));
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    // Flush the current answers right now (not debounced) if the student has
    // unsaved changes, so navigating away never silently drops an answer.
    const { dirty: d, answers: a } = liveStateRef.current;
    if (d && !previewMode) {
      flushSave(Object.values(a));
    }
    const doNavigate = () => {
      setCurrentIdx(clamped);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    // Progressive enhancement: View Transitions API is opt-in by browser.
    // We feature-detect at call time (cheap) rather than at module load
    // (which would force a stale check).
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => unknown;
    };
    if (typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(doNavigate);
    } else {
      doNavigate();
    }
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

  // The mid-attempt "Back" button was removed (see the inline comment in
  // the render where it used to live) — once a quiz is started the only
  // valid exits are Submit or timer expiry. We keep `onBack` on the prop
  // surface for the rare programmatic exit (e.g. teacher preview close),
  // but the in-component flush helper that used to support it is gone.

  useEffect(() => {
    if (previewMode) return; // never auto-submit a preview
    if (remaining === 0 && !submitMutation.isPending) {
      handleSubmit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, previewMode]);

  // ── Time-up warnings ────────────────────────────────────────────────────
  // Toast at T-5min and T-1min so the student isn't blindsided by an
  // auto-submit. We compare prev/current `remaining` in a ref so each
  // threshold fires exactly once even though the timer ticks every second.
  const lastWarnedRef = useRef<{ five: boolean; one: boolean }>({ five: false, one: false });
  useEffect(() => {
    if (previewMode) return; // no time pressure in preview
    // 5-minute warning. Only fire if the attempt is actually long enough
    // that 5 minutes is meaningful (skip on a 3-minute quiz).
    if (
      !lastWarnedRef.current.five &&
      remaining > 0 &&
      remaining <= 300 &&
      expiresAtMs - new Date(data.attempt.started_at).getTime() > 5 * 60_000
    ) {
      lastWarnedRef.current.five = true;
      toast.warning('5 minutes remaining', {
        description: 'Wrap up — answers autosave as you go.',
      });
    }
    // 1-minute warning. Always fires (60s left is universally urgent).
    if (!lastWarnedRef.current.one && remaining > 0 && remaining <= 60) {
      lastWarnedRef.current.one = true;
      toast.error('1 minute remaining', {
        description: 'Your attempt will auto-submit when the timer hits zero.',
        duration: 8000,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  // ── beforeunload save ────────────────────────────────────────────────────
  // If the student closes the tab / navigates away with unsaved keystrokes
  // (still inside the 1.5s debounce window), the regular autosave never
  // fires. Use `fetch keepalive: true` so the browser holds the request
  // alive through the unload. sendBeacon would be simpler but doesn't
  // support setting the X-CSRF-Token header our backend requires.
  //
  // We use a ref to read the *current* answers/dirty at unload time —
  // depending on `answers` in the effect would re-register the listener on
  // every keystroke, which is wasteful and racy.
  const liveStateRef = useRef({ answers, dirty });
  useEffect(() => {
    liveStateRef.current = { answers, dirty };
  }, [answers, dirty]);

  useEffect(() => {
    if (previewMode) return; // preview rows never persist
    const handler = () => {
      const { answers: a, dirty: d } = liveStateRef.current;
      if (!d) return;
      try {
        const csrf = readCsrfCookie();
        fetch(`${QUIZ_API_BASE}/quiz-taking/attempts/${data.attempt.id}/answers`, {
          method: 'PUT',
          keepalive: true,
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(csrf ? { 'X-CSRF-Token': csrf } : {})
          },
          body: JSON.stringify({ answers: Object.values(a) })
        }).catch(() => { /* nothing we can do — tab is closing */ });
      } catch { /* swallow — never block unload */ }
    };
    window.addEventListener('beforeunload', handler);
    // pagehide fires reliably on iOS Safari where beforeunload is flaky
    window.addEventListener('pagehide', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      window.removeEventListener('pagehide', handler);
    };
  }, [data.attempt.id, previewMode]);

  // ── Multi-tab attempt guard ─────────────────────────────────────────────
  // BroadcastChannel keyed on the attempt id. When this tab opens, it
  // announces "claim"; if another tab is already open it replies "ack" and
  // we surface a warning. Last-writer-wins is what the backend does anyway,
  // but the student deserves to know their two open tabs will fight over
  // autosaves. BroadcastChannel is supported in every modern browser; we
  // gracefully degrade if the API is missing (older Safari).
  const [multiTabConflict, setMultiTabConflict] = useState(false);
  useEffect(() => {
    if (previewMode) return;
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(`quiz-attempt-${data.attempt.id}`);
    let acknowledged = false;
    channel.onmessage = (e) => {
      if (e.data === 'claim') {
        // Another tab just opened — let it know we exist and flag locally.
        channel.postMessage('ack');
        setMultiTabConflict(true);
      } else if (e.data === 'ack' && !acknowledged) {
        // We're the new tab and got a reply from an existing one.
        acknowledged = true;
        setMultiTabConflict(true);
      }
    };
    channel.postMessage('claim');
    return () => channel.close();
  }, [data.attempt.id, previewMode]);

  // ── Navigation warning ───────────────────────────────────────────────────
  // Prompt before the user actually leaves so they have a chance to abort.
  // Modern browsers ignore custom strings — only the presence of preventDefault
  // matters. Skip the warning if everything is clean.
  useEffect(() => {
    if (previewMode) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty && Object.keys(answers).length === 0) return;
      e.preventDefault();
      // Legacy browsers want returnValue set; modern just check preventDefault.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty, answers, previewMode]);

  // ── Anti-cheating: violation tracking ────────────────────────────────────
  // We watch for three signals while the attempt is in progress:
  //   • `visibilitychange` (document.hidden) — student switched tab or
  //     minimized the window. The most common cheating vector.
  //   • `copy` on the document — student copied question/answer content.
  //   • `paste` on inputs — student pasted answer text.
  // Each fires a single violation; we POST to the server which echoes the
  // authoritative count back. At the warning ceiling the server finalizes the
  // attempt itself and returns `auto_closed: true`. We then render the
  // "Session Closed" modal and route to the review screen via the same
  // `onSubmitted` callback the normal submit path uses.
  //
  // The ceiling is server-configured and echoed back as `max_warnings` on
  // every violation response. We seed it at 3 (the current server default) so
  // the pre-quiz rules read sensibly before any violation, then trust the
  // server's number once it arrives — never hard-code the displayed limit, or
  // the UI lies the moment the server is reconfigured.
  const [maxWarnings, setMaxWarnings] = useState(3);
  const [warnings, setWarnings] = useState(data.attempt.warnings_shown ?? 0);
  const [activeWarning, setActiveWarning] = useState<{ kind: string; index: number } | null>(null);
  const [autoClosed, setAutoClosed] = useState(false);
  const [acknowledgedInstructions, setAcknowledgedInstructions] = useState(false);
  // Use a ref so the burst-fire visibilitychange handler doesn't double-fire
  // during the in-flight POST. Once a violation is being processed any
  // further events are coalesced — bursts of the same kind in <2s count once.
  const violationInFlightRef = useRef(false);
  const lastViolationAtRef = useRef(0);

  const reportViolation = (kind: string) => {
    if (previewMode || autoClosed) return;
    if (submitMutation.isPending) return;
    if (violationInFlightRef.current) return;
    const now = Date.now();
    if (now - lastViolationAtRef.current < 2000) return; // 2s debounce per burst
    lastViolationAtRef.current = now;
    violationInFlightRef.current = true;
    violationMutation.mutate(
      { attemptId: data.attempt.id, kind },
      {
        onSuccess: (resp) => {
          violationInFlightRef.current = false;
          setWarnings(resp.warnings_shown);
          // Trust the server's configured ceiling over our seed default.
          if (typeof resp.max_warnings === 'number' && resp.max_warnings > 0) {
            setMaxWarnings(resp.max_warnings);
          }
          if (resp.auto_closed) {
            setAutoClosed(true);
            setActiveWarning(null);
            return;
          }
          setActiveWarning({ kind, index: resp.warnings_shown });
        },
        onError: () => {
          violationInFlightRef.current = false;
          // Network failure — we don't show the warning to avoid double-
          // counting on the eventual retry. The student is told via toast
          // so they understand monitoring is degraded.
          toast.warning("Couldn't report monitoring event — will retry next time.");
        }
      }
    );
  };

  // Once auto-closed, push the student forward to the review screen. We
  // refetch the finalized attempt by issuing a submit with the latest
  // answers — the server's idempotent finalizer returns the existing closed
  // row, which carries the full quiz tree the review screen needs.
  useEffect(() => {
    if (!autoClosed) return;
    submitMutation.mutate(
      { quizId: data.quiz.id, attemptId: data.attempt.id, answers: Object.values(answers) },
      {
        onSuccess: (a) => onSubmitted(a),
        onError: () => {
          // Even if this call errors, the server already finalized — let the
          // student dismiss the modal and reload to land on the review.
        }
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoClosed]);

  // Visibility change listener — fires on tab switch, window minimize, OS
  // lock screen, etc. `document.hidden` reads true when the tab is no
  // longer the foreground tab.
  useEffect(() => {
    if (previewMode) return;
    const onVis = () => {
      if (document.hidden) reportViolation('visibility');
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewMode, autoClosed, submitMutation.isPending]);

  // Copy / paste listeners. We attach at the document level so they fire
  // regardless of which element is focused. `paste` events on short-answer
  // textareas count — copying questions out + pasting answers in is the
  // classic "phone in a paste from ChatGPT" pattern.
  useEffect(() => {
    if (previewMode) return;
    const onCopy = () => reportViolation('copy');
    const onPaste = () => reportViolation('paste');
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    return () => {
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewMode, autoClosed, submitMutation.isPending]);

  // ── Screenshot key detection ─────────────────────────────────────────────
  // Browsers can't intercept the actual OS screen capture, but we can detect
  // the keyboard shortcuts the student uses to initiate one:
  //   • Windows / Linux : PrintScreen, or Alt+PrintScreen
  //   • Mac             : Cmd+Shift+3 (full screen)
  //                       Cmd+Shift+4 (selection / crosshair)
  //                       Cmd+Shift+5 (screenshot toolbar)
  //                       Cmd+Ctrl+Shift+3/4 (clipboard variants)
  // When detected we immediately report a violation — same modal + counter
  // as tab-switch, copy, and paste. The watermark is still the forensic
  // trace; this is the deterrent that fires BEFORE the image is shared.
  useEffect(() => {
    if (previewMode) return;
    const onScreenshotKey = (e: KeyboardEvent) => {
      const isPrintScreen = e.key === 'PrintScreen';
      const isMacFullScreen = e.metaKey && e.shiftKey && e.key === '3';
      const isMacSelection  = e.metaKey && e.shiftKey && e.key === '4';
      const isMacToolbar    = e.metaKey && e.shiftKey && e.key === '5';
      // Clipboard variants (Cmd+Ctrl+Shift+3/4) send the same key combo so
      // the shiftKey+metaKey check above already captures them.
      if (isPrintScreen || isMacFullScreen || isMacSelection || isMacToolbar) {
        e.preventDefault(); // suppress the key's default action where possible
        reportViolation('screenshot');
      }
    };
    window.addEventListener('keydown', onScreenshotKey);
    return () => window.removeEventListener('keydown', onScreenshotKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewMode, autoClosed, submitMutation.isPending]);

  // Keyboard handler for the warning modal: Enter dismisses. Acts as the
  // primary "I understand" trigger so students don't have to grab the mouse.
  useEffect(() => {
    if (!activeWarning) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        setActiveWarning(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeWarning]);

  // Human-readable label for the warning kind. Tells the student exactly
  // what they did instead of the generic "suspicious activity".
  const violationLabel = (kind: string) => {
    if (kind === 'visibility') return 'You left the quiz window';
    if (kind === 'copy') return 'You copied content from this page';
    if (kind === 'paste') return 'You pasted content into the quiz';
    if (kind === 'screenshot') return 'Screenshot attempt detected';
    return 'Suspicious activity detected';
  };

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  // 1-9       pick option A-I on the current question (MCQ / T-F)
  // ArrowRight / ArrowDown / j  → next question
  // ArrowLeft  / ArrowUp   / k  → previous question
  // ?         toggle shortcut overlay
  // Enter (with Cmd/Ctrl) opens the submit confirmation
  // We skip handling when the focused element is a textarea/input so the
  // student can type a short-answer response without triggering shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'TEXTAREA' ||
          target.tagName === 'INPUT' ||
          target.isContentEditable);

      if (e.key === '?' && !isTyping) {
        e.preventDefault();
        setShowShortcuts((v) => !v);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        setConfirmingSubmit(true);
        return;
      }
      if (isTyping) return;

      // Only forward navigation is allowed — going back is locked.
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        navigateTo(currentIdx + 1);
        return;
      }

      const num = parseInt(e.key, 10);
      if (!Number.isNaN(num) && num >= 1 && num <= 9) {
        const q = data.questions[currentIdx];
        if (q && q.question_type !== 'SHORT_ANSWER') {
          const opt = q.options[num - 1];
          if (opt) {
            e.preventDefault();
            updateAnswer(q.id, { selected_option_id: opt.id, text_answer: null });
          }
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, data.questions]);

  // Render the autosave status pill. Four states: offline (with queue
  // count), saving, saved-recently, errored. Offline takes priority because
  // it's the most actionable signal — if the student keeps typing, the
  // page wants them to understand their answers are being held locally.
  const saveStatus = (() => {
    if (isOffline) {
      return {
        icon: CloudOff,
        text: queuedCount > 0
          ? `Offline · ${queuedCount} change${queuedCount === 1 ? '' : 's'} queued`
          : 'Offline · changes will sync',
        tone: 'text-warning',
        spin: false
      };
    }
    if (queuedCount > 0) {
      return {
        icon: Loader2,
        text: `Syncing ${queuedCount} queued change${queuedCount === 1 ? '' : 's'}…`,
        tone: 'text-muted-foreground',
        spin: true
      };
    }
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
        tone: 'text-success',
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

  return (
    <div className='space-y-4'>
      {/* No Back button in student mode — once a quiz is started the only
          valid exits are Submit or timer expiry. A Back button would let
          students leave mid-attempt, look up answers, and resume via
          Continue, which defeats one-way question locking. */}
      {/* Preview mode banner — clear visual cue that nothing here persists. */}
      {previewMode && (
        <div className='rounded-lg border border-warning bg-warning-muted text-warning-foreground px-3 py-2 text-sm flex items-center gap-2'>
          <Eye className='w-4 h-4 shrink-0' />
          <span>
            <strong>Preview mode</strong> — answers and timer don&apos;t persist.
            This is exactly what students see.
          </span>
        </div>
      )}
      {/* ── Pre-quiz rules modal (blocking gate) ───────────────────────── */}
      <AlertDialog open={!previewMode && !acknowledgedInstructions}>
        <AlertDialogContent className='max-w-md'>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2'>
              <ShieldAlert className='w-5 h-5 text-warning' />
              Before you start — important rules
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='space-y-3 text-sm'>
                <ul className='space-y-2 list-disc pl-4 text-muted-foreground'>
                  <li><strong className='text-foreground'>Don&apos;t leave this tab or window</strong> — switching tabs or minimising earns a warning.</li>
                  <li><strong className='text-foreground'>No copying or pasting</strong> — both actions earn a warning.</li>
                  <li><strong className='text-foreground'>Questions are one-way</strong> — once you move to the next question you cannot go back.</li>
                  <li><strong className='text-foreground'>Screenshots are traceable</strong> — quiz content is watermarked with your name and can be linked back to your account.</li>
                  <li>After <strong className='text-foreground'>{maxWarnings} warnings</strong> the quiz auto-submits with whatever answers you have saved.</li>
                  {confidenceScoring && (
                    <li>
                      <strong className='text-foreground'>Confidence scoring is on</strong> — you&apos;ll mark each answer Low / Medium / High. Confidently-wrong answers lose half their points, so don&apos;t guess.
                    </li>
                  )}
                </ul>
                <p className='text-[11px] italic text-muted-foreground border-t pt-2'>
                  Your activity is monitored to ensure academic integrity. The timer starts now.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className='w-full gap-1' onClick={() => setAcknowledgedInstructions(true)}>
              <Check className='w-4 h-4' /> I understand — let&apos;s begin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Quiz header ─────────────────────────────────────────────────── */}
      <div className='flex items-start justify-between gap-4 pb-1'>
        <div className='min-w-0'>
          <h2 className='text-2xl font-bold leading-tight truncate'>{data.quiz.title}</h2>
          <p className='text-sm text-muted-foreground mt-0.5'>
            {data.totalPoints} points &bull; {data.questions.length} questions
          </p>
        </div>
        <div
          className={`shrink-0 flex items-center gap-1.5 border rounded-lg px-3 py-1.5 tabular-nums font-semibold text-sm ${
            remaining < 60
              ? 'border-destructive/50 text-destructive'
              : remaining < 300
                ? 'border-warning text-warning'
                : 'border-warning text-warning'
          }`}
          role='timer'
          aria-live={remaining < 60 ? 'assertive' : 'off'}
        >
          <Clock className='w-4 h-4' />
          {formatSeconds(remaining)}
        </div>
      </div>

      {/* ── Anti-cheating banner (always visible) ───────────────────────── */}
      {!previewMode && (
        <div className='rounded-lg bg-warning-muted border border-warning p-4'>
          <div className='flex items-start gap-2'>
            <ShieldAlert className='w-5 h-5 text-warning shrink-0 mt-0.5' />
            <div className='space-y-1.5'>
              <p className='font-semibold text-sm text-warning-foreground'>
                Important Anti-Cheating Instructions:
              </p>
              <ul className='list-disc pl-4 space-y-0.5 text-sm text-warning-foreground'>
                <li>You cannot copy or paste any content during the quiz.</li>
                <li>Attempting to leave this tab or close the window is considered suspicious.</li>
                <li>
                  Each tab switch, copy, or paste earns a warning. After {maxWarnings} warnings, your quiz
                  will automatically close and be submitted with the answers completed so far.
                </li>
              </ul>
              <p className='text-sm font-bold text-warning-foreground pt-0.5'>
                Your actions are monitored to ensure fairness and academic integrity.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Multi-tab guard */}
      {multiTabConflict && (
        <div className='rounded-lg border border-destructive/40 bg-destructive/5 text-destructive px-3 py-2 text-sm flex items-start gap-2'>
          <AlertTriangle className='w-4 h-4 shrink-0 mt-0.5' />
          <div>
            <p className='font-medium'>This quiz is open in another tab.</p>
            <p className='text-xs'>Close one tab to avoid answers overwriting each other.</p>
          </div>
        </div>
      )}

      {/* ── Progress bar ─────────────────────────────────────────────────── */}
      <div>
        <div className='flex items-center justify-between text-sm font-semibold mb-2'>
          <span>Question {currentIdx + 1} of {data.questions.length}</span>
          <span className='text-muted-foreground font-normal'>{Math.round(progressPct)}% complete</span>
        </div>
        <div className='h-2 rounded-full bg-muted overflow-hidden'>
          <div
            className='h-full bg-primary rounded-full transition-[width] duration-300 ease-out'
            style={{ width: `${progressPct}%` }}
            aria-hidden
          />
        </div>
        {/* Autosave status — small, below the bar */}
        {saveStatus && (
          <p className={`text-[11px] flex items-center gap-1 mt-1 ${saveStatus.tone}`} role='status' aria-live='polite'>
            <saveStatus.icon className={`w-3 h-3 ${saveStatus.spin ? 'animate-spin' : ''}`} />
            {saveStatus.text}
          </p>
        )}
      </div>

      {/* ── Single question card ─────────────────────────────────────────── */}
      {(() => {
        const q = data.questions[currentIdx];
        if (!q) return null;
        const a = answers[q.id];
        return (
          <div
            key={q.id}
            className='relative overflow-hidden rounded-xl bg-muted/40 p-6 space-y-5'
            // The transition-name lets the View Transitions API match this
            // element across the navigateTo() state change and animate it.
            // Identical on every question card — that's intentional: the
            // browser sees "this card replaced that card" and slides between.
            style={{ viewTransitionName: 'quiz-question-card' }}
          >
            {/* Screenshot-deterrent watermark */}
            {!previewMode && (
              <div className='absolute inset-0 pointer-events-none select-none overflow-hidden rounded-xl' aria-hidden>
                {[0, 1, 2, 3].map((row) =>
                  [0, 1, 2].map((col) => (
                    <span
                      key={`${row}-${col}`}
                      className='absolute text-[9px] font-medium text-foreground/[0.07] whitespace-nowrap'
                      style={{ transform: 'rotate(-22deg)', top: `${row * 30 + 10}%`, left: `${col * 38 - 8}%` }}
                    >
                      {watermarkLabel}
                    </span>
                  ))
                )}
              </div>
            )}

            {/* Question text with pts badge */}
            <div className='flex items-start gap-3'>
              <span className='shrink-0 mt-0.5 text-xs font-semibold bg-muted text-muted-foreground rounded-md px-2 py-1 tabular-nums'>
                {q.points} pts
              </span>
              <p className='font-bold text-base leading-snug select-none'>{q.question_text}</p>
            </div>

            {/* Answer area */}
            {q.question_type === 'SHORT_ANSWER' ? (
              <Textarea
                rows={4}
                placeholder='Type your answer…'
                value={a?.text_answer ?? ''}
                onChange={(e) => updateAnswer(q.id, { text_answer: e.target.value, selected_option_id: null })}
                className='bg-background'
              />
            ) : (
              <div className='space-y-2'>
                {q.options.map((o) => {
                  const isSelected = a?.selected_option_id === o.id;
                  return (
                    <label
                      key={o.id}
                      className={`flex items-center p-4 rounded-lg border bg-background cursor-pointer transition-colors select-none ${
                        isSelected
                          ? 'border-primary bg-primary/5 font-medium'
                          : 'border-border hover:bg-muted/60'
                      }`}
                    >
                      <input
                        type='radio'
                        name={`q-${q.id}`}
                        checked={isSelected}
                        onChange={() => updateAnswer(q.id, { selected_option_id: o.id, text_answer: null })}
                        className='sr-only'
                      />
                      <span className='text-sm'>{o.option_text}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* ── Confidence selector (Cologne / Bristol scoring) ───────── */}
            {confidenceScoring && q.question_type !== 'SHORT_ANSWER' && (
              <div className='pt-2 border-t border-border/50'>
                <p className='text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wide'>
                  How confident are you?
                </p>
                <div className='grid grid-cols-3 gap-2'>
                  {([
                    { v: 'LOW', label: 'Low', desc: '½ pts if right', tone: 'warning' },
                    { v: 'MED', label: 'Medium', desc: '¾ pts if right', tone: 'info' },
                    { v: 'HIGH', label: 'High', desc: 'Full pts · −½ if wrong', tone: 'success' },
                  ] as const).map((c) => {
                    const picked = (a?.confidence ?? 'MED') === c.v;
                    const colour =
                      c.tone === 'warning'
                        ? picked
                          ? 'border-warning bg-warning-muted text-warning-foreground'
                          : 'border-border bg-background hover:border-warning'
                        : c.tone === 'info'
                          ? picked
                            ? 'border-info bg-info-muted text-info-foreground'
                            : 'border-border bg-background hover:border-info'
                          : picked
                            ? 'border-success bg-success-muted text-success-foreground'
                            : 'border-border bg-background hover:border-success';
                    return (
                      <button
                        key={c.v}
                        type='button'
                        onClick={() => updateAnswer(q.id, { confidence: c.v })}
                        className={`p-2 rounded-lg border text-left transition-colors ${colour}`}
                      >
                        <p className='text-sm font-semibold'>{c.label}</p>
                        <p className='text-[10px] opacity-80'>{c.desc}</p>
                      </button>
                    );
                  })}
                </div>
                <p className='text-[10px] text-muted-foreground mt-2 italic'>
                  Confidence scoring rewards calibrated thinking. Confidently
                  wrong answers lose half-points; honest uncertainty doesn&apos;t.
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Navigation bar ───────────────────────────────────────────────── */}
      {(() => {
        const isLast = currentIdx === data.questions.length - 1;
        return (
          <div className='flex items-center justify-between pt-1'>
            {/* Previous — always disabled (one-way navigation) */}
            <span className='text-sm text-muted-foreground cursor-not-allowed select-none'>
              Previous
            </span>

            {/* Warnings badge (shown when violations exist) */}
            {!previewMode && warnings > 0 && (
              <div
                className='flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-destructive/40 bg-destructive/5 text-destructive tabular-nums'
                aria-live='assertive'
              >
                <ShieldAlert className='w-3 h-3' />
                {warnings}/{maxWarnings} warnings
              </div>
            )}

            {/* Next Question / Submit. We disable submit while offline or
                with queued changes — finalizing the attempt against stale
                server state could overwrite a queued autosave. The pill
                explains the wait so the student doesn't think it's broken. */}
            {isLast ? (
              <Button
                onClick={() => previewMode ? onClosePreview?.() : setConfirmingSubmit(true)}
                disabled={submitMutation.isPending || isOffline || queuedCount > 0}
                variant={previewMode ? 'outline' : 'default'}
                className='rounded-full px-6'
                title={
                  isOffline
                    ? 'Waiting for connection — your answers are queued'
                    : queuedCount > 0
                      ? 'Finishing pending saves before submit'
                      : undefined
                }
              >
                {previewMode ? 'Close preview'
                  : submitMutation.isPending ? <><Loader2 className='w-4 h-4 animate-spin mr-1' />Submitting…</>
                  : isOffline ? 'Waiting to reconnect…'
                  : queuedCount > 0 ? 'Syncing…'
                  : 'Submit Quiz'}
              </Button>
            ) : (
              <Button
                onClick={() => navigateTo(currentIdx + 1)}
                className='rounded-full px-6'
              >
                Next Question
              </Button>
            )}
          </div>
        );
      })()}

      {/* Keyboard shortcuts overlay — opened by `?`, the keyboard hint
          button in the header, or programmatically. The dialog uses the
          standard radix focus trap so Escape closes cleanly. */}
      <AlertDialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <AlertDialogContent className='max-w-sm'>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2'>
              <Keyboard className='w-4 h-4' />
              Keyboard shortcuts
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='space-y-2 text-sm'>
                <ul className='space-y-1.5'>
                  <li className='flex items-center justify-between gap-3'>
                    <span className='text-muted-foreground'>Pick option A–I</span>
                    <span className='flex gap-1'>
                      <kbd className='px-1.5 py-0.5 text-[10px] rounded border bg-muted/50 font-sans'>1</kbd>
                      <span className='text-muted-foreground'>–</span>
                      <kbd className='px-1.5 py-0.5 text-[10px] rounded border bg-muted/50 font-sans'>9</kbd>
                    </span>
                  </li>
                  <li className='flex items-center justify-between gap-3'>
                    <span className='text-muted-foreground'>Next question</span>
                    <span className='flex gap-1'>
                      <kbd className='px-1.5 py-0.5 text-[10px] rounded border bg-muted/50 font-sans'>→</kbd>
                      <span className='text-muted-foreground'>or</span>
                      <kbd className='px-1.5 py-0.5 text-[10px] rounded border bg-muted/50 font-sans'>J</kbd>
                    </span>
                  </li>
                  <li className='flex items-center justify-between gap-3'>
                    <span className='text-muted-foreground'>Submit attempt</span>
                    <span className='flex gap-1 items-center'>
                      <kbd className='px-1.5 py-0.5 text-[10px] rounded border bg-muted/50 font-sans'>Ctrl</kbd>
                      <span className='text-muted-foreground'>+</span>
                      <kbd className='px-1.5 py-0.5 text-[10px] rounded border bg-muted/50 font-sans'>Enter</kbd>
                    </span>
                  </li>
                  <li className='flex items-center justify-between gap-3'>
                    <span className='text-muted-foreground'>Toggle this overlay</span>
                    <kbd className='px-1.5 py-0.5 text-[10px] rounded border bg-muted/50 font-sans'>?</kbd>
                  </li>
                </ul>
                <p className='text-xs text-muted-foreground pt-2 border-t'>
                  Shortcuts pause while typing in the short-answer box.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowShortcuts(false)}>
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submit confirmation — warns about unanswered questions and reminds
          the student the action is final. The cancel button is the default
          focus so an accidental Enter doesn't submit. */}
      <AlertDialog open={confirmingSubmit} onOpenChange={setConfirmingSubmit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit your attempt?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='space-y-2 text-sm'>
                {answeredCount < data.questions.length ? (
                  <div className='space-y-1'>
                    <p className='flex items-start gap-2 text-warning'>
                      <AlertTriangle className='w-4 h-4 shrink-0 mt-0.5' />
                      <span>
                        You have{' '}
                        <strong>{data.questions.length - answeredCount}</strong>{' '}
                        unanswered question
                        {data.questions.length - answeredCount === 1 ? '' : 's'}.
                        Unanswered questions score zero.
                      </span>
                    </p>
                    <button
                      type='button'
                      className='text-xs underline text-muted-foreground hover:text-foreground'
                      onClick={() => {
                        setConfirmingSubmit(false);
                        const firstIdx = data.questions.findIndex((q) => {
                          const ans = answers[q.id];
                          return !(
                            (ans?.selected_option_id ?? null) !== null ||
                            (ans?.text_answer != null && ans.text_answer.trim() !== '')
                          );
                        });
                        if (firstIdx !== -1) navigateTo(firstIdx);
                      }}
                    >
                      Go to first unanswered question
                    </button>
                  </div>
                ) : (
                  <p className='flex items-start gap-2 text-success'>
                    <Check className='w-4 h-4 shrink-0 mt-0.5' />
                    <span>All {data.questions.length} questions answered.</span>
                  </p>
                )}
                <p className='text-muted-foreground'>
                  Once submitted, you can&apos;t change your answers. This will
                  count as one of your attempts.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep working</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmingSubmit(false);
                handleSubmit(false);
              }}
            >
              Submit now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Warning modal — fires on every detected violation BEFORE auto-close.
          Title leads with what the student actually did (instead of the
          generic "Suspicious activity") so they know exactly which behavior
          tripped the alarm. Acknowledgment is a normal-width neutral button:
          the action is just "I understand", not a destructive operation, so
          it doesn't deserve a full-width orange button. */}
      <Dialog
        open={activeWarning !== null && !autoClosed}
        onOpenChange={(open) => !open && setActiveWarning(null)}
      >
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <AlertTriangle className='w-5 h-5 text-warning' />
              {activeWarning ? violationLabel(activeWarning.kind) : 'Warning'}
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-2 text-sm'>
            <p>
              <span className='font-medium'>Warning {warnings} of {maxWarnings}.</span>{' '}
              {warnings >= maxWarnings - 1
                ? 'One more warning will auto-submit your quiz with your current answers.'
                : `After ${maxWarnings} warnings the quiz will auto-submit with your current answers.`}
            </p>
            <p className='text-xs text-muted-foreground'>
              Stay on this tab and avoid copying or pasting to finish without interruption.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setActiveWarning(null)} autoFocus>
              I understand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-closed modal — terminal state. The student can't return to the
          quiz; the only forward path is "see what was submitted". We render
          a calm red-tinted card rather than an aggressive scrim because
          they've already lost — pile-driving them isn't constructive. */}
      <Dialog open={autoClosed} onOpenChange={() => { /* no-op — terminal */ }}>
        <DialogContent className='max-w-md' onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-destructive'>
              <ShieldAlert className='w-5 h-5' />
              Quiz session closed
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-2 text-sm'>
            <p>
              You reached the {maxWarnings}-warning limit. Your quiz has been
              submitted automatically with the answers you had saved.
            </p>
            <p className='text-xs text-muted-foreground'>
              Your teacher can see this attempt in the results table along with
              the count of monitoring events.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                // By the time the modal renders, the submit echo to finalize
                // and fetch the review payload is already in flight (see the
                // `autoClosed` effect). On success the parent unmounts this
                // component and shows AttemptReview — the modal disappears
                // naturally. This button is the fallback for when the echo
                // failed: force a reload so the student's quiz list re-renders
                // with the closed-attempt row.
                window.location.reload();
              }}
              disabled={submitMutation.isPending}
              variant='outline'
            >
              {submitMutation.isPending ? 'Loading review…' : 'View my submission'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StudentView({ courseId }: { courseId: string }) {
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

    // "Attempt N of M" badge — only meaningful when the teacher allowed
    // > 1 attempt OR the student has used some. Hide when 1/1 (the default).
    const attemptsUsed = q.attemptsUsed ?? 0;
    const showAttempts = q.max_attempts > 1 || attemptsUsed > 0;
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
            <p className='font-medium truncate'>{q.title}</p>
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

/// Per-question analytics view. Shows the difficulty of each question
/// (correct rate), with an MCQ option-distribution breakdown so the teacher
/// can spot misleading distractors. Sorting toggles between document order
/// and "hardest first" — useful for spotting the questions that need a
/// reword before the next term.
function QuizAnalyticsView({ quizId }: { quizId: number }) {
  const { data, isLoading } = useQuizAnalytics(quizId);
  const [sortBy, setSortBy] = useState<'order' | 'hardest'>('order');

  if (isLoading || !data) return <ListSkeleton variant='row' count={3} />;

  if (data.totalSubmissions === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title='No data yet'
        description='Analytics appear once at least one student submits an attempt.'
      />
    );
  }

  const sorted =
    sortBy === 'hardest'
      ? [...data.questions].sort((a, b) => {
          // null correctRate (no graded answers) goes to the bottom — not
          // meaningful as "hardest". Otherwise ascending so 0% lands first.
          const av = a.correctRate ?? 1000;
          const bv = b.correctRate ?? 1000;
          return av - bv;
        })
      : [...data.questions].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className='space-y-3'>
      {/* Summary card — one-line "X submissions · avg Y%" rollup. */}
      <div className='border rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap'>
        <div className='flex items-center gap-4'>
          <div>
            <p className='text-[11px] text-muted-foreground uppercase tracking-wide'>
              Submissions
            </p>
            <p className='text-lg font-semibold tabular-nums'>{data.totalSubmissions}</p>
          </div>
          <div>
            <p className='text-[11px] text-muted-foreground uppercase tracking-wide'>
              Avg score
            </p>
            <p className='text-lg font-semibold tabular-nums'>
              {data.avgScore != null ? `${data.avgScore}%` : '—'}
            </p>
          </div>
        </div>
        <Button
          variant='ghost'
          size='sm'
          className='gap-1'
          onClick={() => setSortBy(sortBy === 'order' ? 'hardest' : 'order')}
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${
              sortBy === 'hardest' ? 'rotate-180' : ''
            }`}
          />
          {sortBy === 'hardest' ? 'Hardest first' : 'In order'}
        </Button>
      </div>

      {/* Per-question rows. Each row: question text, correct-rate bar,
          and a collapsible option distribution for MCQ/T-F. */}
      <div className='space-y-2'>
        {sorted.map((q, i) => {
          const rate = q.correctRate;
          // Bar color tracks correctness — green ≥80, amber ≥50, red <50.
          const bar =
            rate == null
              ? 'bg-muted'
              : rate >= 80
                ? 'bg-success'
                : rate >= 50
                  ? 'bg-warning'
                  : 'bg-destructive';
          return (
            <details
              key={q.id}
              className='border rounded-xl p-3 group'
              {...(rate != null && rate < 50 ? { open: true } : {})}
            >
              <summary className='list-none cursor-pointer space-y-2'>
                <div className='flex items-start justify-between gap-3'>
                  <p className='text-sm font-medium leading-snug'>
                    <span className='text-muted-foreground tabular-nums mr-1'>
                      {sortBy === 'order' ? q.order_index + 1 : i + 1}.
                    </span>
                    {q.question_text}
                  </p>
                  <div className='shrink-0 flex items-center gap-2'>
                    {rate != null ? (
                      <Badge
                        variant='outline'
                        className={`tabular-nums text-[10px] ${
                          rate >= 80
                            ? 'text-success border-success'
                            : rate >= 50
                              ? 'text-warning border-warning'
                              : 'text-destructive border-destructive/40'
                        }`}
                      >
                        {rate}% correct
                      </Badge>
                    ) : (
                      <Badge variant='outline' className='text-[10px] text-muted-foreground'>
                        Ungraded
                      </Badge>
                    )}
                    {q.pending > 0 && (
                      <Badge variant='secondary' className='text-[10px] tabular-nums'>
                        {q.pending} pending
                      </Badge>
                    )}
                  </div>
                </div>
                {/* Correct-rate bar. Muted when null so the row still has a
                    visual rhythm with the others. */}
                <div className='h-1.5 rounded-full overflow-hidden bg-muted'>
                  <div
                    className={`h-full transition-all duration-300 ${bar}`}
                    style={{ width: `${rate ?? 0}%` }}
                    aria-hidden
                  />
                </div>
                <p className='text-[11px] text-muted-foreground tabular-nums'>
                  {q.correctCount}/{Math.max(q.totalAnswered - q.pending, 0)} correct ·{' '}
                  {q.totalAnswered} answered
                </p>
              </summary>
              {/* Option distribution — only for MCQ/T-F. The correct option
                  is annotated and any wrong option students gravitated to
                  is bolded so the teacher can spot misleading distractors. */}
              {q.optionStats && q.optionStats.length > 0 && (
                <div className='mt-3 pt-3 border-t space-y-1.5'>
                  {q.optionStats.map((o, optIdx) => {
                    const isMostPicked =
                      q.optionStats &&
                      o.pickedCount > 0 &&
                      Math.max(...q.optionStats.map((s) => s.pickedCount)) ===
                        o.pickedCount;
                    return (
                      <div key={o.optionId} className='space-y-1'>
                        <div className='flex items-center justify-between text-xs gap-2'>
                          <div className='flex items-center gap-2 min-w-0'>
                            <span className='text-[10px] font-medium text-muted-foreground tabular-nums w-4 shrink-0'>
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span
                              className={`truncate ${o.is_correct ? 'font-medium' : ''}`}
                            >
                              {o.option_text}
                            </span>
                            {o.is_correct && (
                              <Check className='w-3 h-3 text-success shrink-0' />
                            )}
                            {isMostPicked && !o.is_correct && (
                              <Badge
                                variant='outline'
                                className='text-[9px] text-destructive border-destructive/40 shrink-0'
                              >
                                Most-picked wrong
                              </Badge>
                            )}
                          </div>
                          <span className='tabular-nums text-muted-foreground shrink-0'>
                            {o.pickedPct}% ({o.pickedCount})
                          </span>
                        </div>
                        <div className='h-1 rounded-full overflow-hidden bg-muted'>
                          <div
                            className={`h-full transition-all ${
                              o.is_correct ? 'bg-success' : 'bg-muted-foreground/40'
                            }`}
                            style={{ width: `${o.pickedPct}%` }}
                            aria-hidden
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </details>
          );
        })}
      </div>
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
  const { data: roster = [] } = useRoster(courseId);
  const [grading, setGrading] = useState<QuizAttempt | null>(null);
  const [tab, setTab] = useState<'attempts' | 'analytics'>('attempts');
  // Status filter pill — mirrors the teacher's mental model. "Not started"
  // is computed from the roster: enrolled students with zero attempts.
  type StatusFilter = 'all' | 'submitted' | 'in_progress' | 'not_started';
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

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

  // Build the full table model: every enrolled student + their most recent
  // attempt (or null for "Not started"). Shape mirrors `SubmissionRow` in
  // course-assignments.tsx — teachers expect to see the full class roster,
  // not just submitters. Most-recent-attempt wins so a student who started
  // a second attempt after submitting their first one shows the latest state.
  type AttemptRow = {
    studentId: number;
    student: { id: number; full_name: string; number?: string; email?: string };
    attempt: QuizAttempt | null;
  };
  const attemptByStudent = (() => {
    const m = new Map<number, QuizAttempt>();
    for (const a of attempts) {
      const prev = m.get(a.studentId);
      // Prefer most-recently-started; fall back to first seen.
      if (!prev || new Date(a.started_at) > new Date(prev.started_at)) {
        m.set(a.studentId, a);
      }
    }
    return m;
  })();
  const allRows: AttemptRow[] = roster.map((rs) => ({
    studentId: rs.id,
    student: { id: rs.id, full_name: rs.full_name, number: rs.number, email: rs.email },
    attempt: attemptByStudent.get(rs.id) ?? null,
  }));

  // Status classifier — drives both the filter pill counts and the per-row
  // Status badge. "in_progress" = attempt row exists with no `submitted_at`.
  const rowStatus = (row: AttemptRow): 'submitted' | 'in_progress' | 'not_started' => {
    if (!row.attempt) return 'not_started';
    return row.attempt.submitted_at ? 'submitted' : 'in_progress';
  };

  const filteredRows = allRows
    .filter((r) => statusFilter === 'all' || rowStatus(r) === statusFilter)
    .filter((r) => {
      if (!search.trim()) return true;
      const needle = search.toLowerCase();
      return (
        r.student.full_name.toLowerCase().includes(needle) ||
        (r.student.number ?? '').toLowerCase().includes(needle) ||
        (r.student.email ?? '').toLowerCase().includes(needle)
      );
    });

  // CSV export — one row per enrolled student (NOT just submitters) so the
  // teacher can paste into a gradebook and see everyone's status. Same
  // structure as `downloadGradeCsv` in course-assignments.tsx. Generated
  // client-side because the backend doesn't need the data and the export
  // is fast for any realistic class size.
  const downloadAttemptsCsv = () => {
    const header = [
      'Student',
      'Student ID',
      'Email',
      'Status',
      'Started At',
      'Submitted At',
      'Score (%) — latest attempt',
      'Violations',
      'Closure Reason',
    ];
    const rows = allRows.map(({ student, attempt }) => {
      const status = !attempt
        ? 'not_started'
        : attempt.submitted_at
          ? 'submitted'
          : 'in_progress';
      return [
        student.full_name,
        student.number ?? '',
        student.email ?? '',
        status,
        attempt?.started_at ? format(new Date(attempt.started_at), 'yyyy-MM-dd HH:mm') : '',
        attempt?.submitted_at ? format(new Date(attempt.submitted_at), 'yyyy-MM-dd HH:mm') : '',
        attempt?.score != null ? String(Math.round(attempt.score)) : '',
        attempt?.violations_count != null ? String(attempt.violations_count) : '',
        attempt?.closure_reason ?? '',
      ];
    });
    // CSV-cell escaper with formula-injection guard. Beyond the usual
    // quote-doubling, a cell that *starts* with =, +, -, @ (or a tab/CR) is
    // executed as a formula by Excel / Sheets — a student named `=cmd|…` would
    // run on open. Prefix those with a single quote so the spreadsheet treats
    // the whole cell as text. The leading `'` is invisible once rendered.
    const csvSafe = (value: unknown) => {
      let s = String(value ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = [header, ...rows]
      .map((r) => r.map(csvSafe).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quiz.title.replace(/[^a-z0-9]/gi, '_')}_attempts.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Counts for the filter pills.
  const counts = {
    all: allRows.length,
    submitted: allRows.filter((r) => rowStatus(r) === 'submitted').length,
    in_progress: allRows.filter((r) => rowStatus(r) === 'in_progress').length,
    not_started: allRows.filter((r) => rowStatus(r) === 'not_started').length,
  };

  return (
    <div className='space-y-3'>
      <Button variant='ghost' onClick={onBack} className='gap-1'>
        <ArrowLeft className='w-4 h-4' /> Back
      </Button>
      <div className='flex items-center justify-between gap-2 flex-wrap'>
        <div className='flex items-center gap-2 flex-wrap'>
          <h3 className='font-bold text-lg'>{quiz.title}</h3>
          {pendingCount > 0 && tab === 'attempts' && (
            <Badge variant='destructive'>{pendingCount} need grading</Badge>
          )}
        </div>
        <SegmentedControl
          ariaLabel='Attempts or analytics view'
          value={tab}
          onChange={setTab}
          options={[
            { value: 'attempts', label: 'Attempts' },
            { value: 'analytics', label: (<span className='inline-flex items-center gap-1'><BarChart3 className='w-3 h-3' />Analytics</span>) }
          ]}
        />
      </div>

      {tab === 'analytics' ? (
        <QuizAnalyticsView quizId={quiz.id} />
      ) : (
        <>
          {/* Live monitor — collapsible WebSocket-powered dashboard showing
              students currently taking the quiz. Sits above the historical
              table so the teacher sees in-flight activity first. */}
          <QuizLiveMonitor quizId={quiz.id} />

          {/* Filter pills + search + CSV export. Sits above the table to
              match the design and to mirror the assignment submissions view
              for cross-tab consistency. Counts use `tabular-nums` so the
              numbers stay aligned as the filters change. */}
          <div className='flex flex-wrap items-center gap-2'>
            <SegmentedControl
              ariaLabel='Filter attempts by status'
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All', count: counts.all },
                { value: 'submitted', label: 'Submitted', count: counts.submitted },
                { value: 'in_progress', label: 'In progress', count: counts.in_progress },
                { value: 'not_started', label: 'Not started', count: counts.not_started }
              ]}
            />
            <div className='relative flex-1 min-w-[200px] max-w-xs'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
              <Input
                placeholder='Search student…'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='pl-10 h-8'
              />
            </div>
            <Button
              variant='outline'
              size='sm'
              className='gap-1 ml-auto'
              onClick={downloadAttemptsCsv}
            >
              <Download className='w-4 h-4' /> Export CSV
            </Button>
          </div>

          {isLoading && <ListSkeleton variant='row' count={3} />}
          <div className='border rounded-lg overflow-hidden'>
            <Table>
              <TableHeader className='bg-muted/30'>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Monitoring</TableHead>
                  <TableHead className='text-right'>Score</TableHead>
                  <TableHead className='w-px' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => {
                  const { studentId, student, attempt } = row;
                  const status = rowStatus(row);
                  const pending = attempt ? needsGrading(attempt) : false;
                  const isAutoSubmit = attempt?.closure_reason === 'time_expired';
                  const closedForViolations = attempt?.closure_reason === 'violations';
                  const violations = attempt?.violations_count ?? 0;
                  return (
                    <TableRow
                      key={studentId}
                      className={`${attempt ? 'cursor-pointer hover:bg-muted/30' : 'opacity-60'}`}
                      onClick={() => attempt && setGrading(attempt)}
                    >
                      <TableCell>
                        <div className='flex flex-col gap-0.5'>
                          <span className='font-medium'>{student.full_name}</span>
                          {student.number && (
                            <span className='text-[11px] text-muted-foreground tabular-nums'>
                              {student.number}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className='text-muted-foreground'>
                        {attempt?.started_at
                          ? format(new Date(attempt.started_at), 'MMM d, h:mm a')
                          : <span className='text-xs'>—</span>}
                      </TableCell>
                      <TableCell className='text-muted-foreground'>
                        {attempt?.submitted_at
                          ? format(new Date(attempt.submitted_at), 'MMM d, h:mm a')
                          : <span className='text-xs'>—</span>}
                      </TableCell>
                      <TableCell>
                        {/* Status badge — green/amber/gray maps to the design.
                            Auto-submit / violations callouts ride along as a
                            sub-badge so the teacher can spot abnormal closures
                            without leaving the row. */}
                        <div className='flex flex-wrap gap-1'>
                          <Badge
                            variant='outline'
                            className={`text-[10px] gap-1 capitalize ${
                              status === 'submitted'
                                ? 'text-success border-success'
                                : status === 'in_progress'
                                  ? 'text-warning border-warning'
                                  : 'text-muted-foreground'
                            }`}
                          >
                            {status === 'submitted' && <Check className='w-3 h-3' />}
                            {status === 'in_progress' && <Loader2 className='w-3 h-3' />}
                            {status === 'not_started' && <Square className='w-3 h-3' />}
                            {status.replace('_', ' ')}
                          </Badge>
                          {isAutoSubmit && (
                            <Badge variant='outline' className='text-[10px]'>
                              Time expired
                            </Badge>
                          )}
                          {closedForViolations && (
                            <Badge variant='destructive' className='text-[10px]'>
                              Auto-closed
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
                        {/* Monitoring column — surfaces violations_count.
                            Hovering shows the closure reason if any. We use a
                            destructive-tinted pill for any non-zero count so
                            it stands out without dominating clean rows. */}
                        {violations > 0 ? (
                          <Badge
                            variant='outline'
                            className='gap-1 text-[10px] text-destructive border-destructive/40'
                            title={
                              closedForViolations
                                ? 'Quiz auto-closed for violations'
                                : `${violations} monitoring event${violations === 1 ? '' : 's'}`
                            }
                          >
                            <ShieldAlert className='w-3 h-3' />
                            {violations} violation{violations === 1 ? '' : 's'}
                          </Badge>
                        ) : (
                          <span className='text-xs text-muted-foreground'>clean</span>
                        )}
                      </TableCell>
                      <TableCell className='text-right tabular-nums'>
                        {attempt?.score != null
                          ? `${Math.round(attempt.score)}%`
                          : <span className='text-xs text-muted-foreground'>—</span>}
                      </TableCell>
                      <TableCell className='text-right pr-2'>
                        {attempt ? (
                          <Button
                            variant='ghost'
                            size='sm'
                            className='gap-1'
                            onClick={(e) => {
                              e.stopPropagation();
                              setGrading(attempt);
                            }}
                          >
                            <Eye className='w-3.5 h-3.5' />
                            {pending ? 'Grade' : 'Review'}
                          </Button>
                        ) : (
                          <span className='text-xs text-muted-foreground pr-3'>—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!isLoading && filteredRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className='text-center text-sm text-muted-foreground py-8'>
                      {search.trim() || statusFilter !== 'all'
                        ? 'No students match your filters.'
                        : roster.length === 0
                          ? 'No students enrolled yet.'
                          : 'No attempts yet.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
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
  const duplicateMutation = useDuplicateQuiz(courseId);
  const queryClient = useQueryClient();
  const { run: runDelete } = useDeleteWithUndo();

  // Optimistic publish-toggle. Flips `is_draft` on the cached list right away
  // (so the badge updates without a network flash) and rolls back if the
  // PATCH fails. We can't reuse updateMutation's onSuccess invalidate here
  // because that would refetch and visually "blink" the row — the optimistic
  // patch is cleaner for a simple boolean toggle.
  const togglePublish = (quiz: Quiz) => {
    const key = quizKeys.list(courseId);
    const nextDraft = !quiz.is_draft;
    const snapshot = queryClient.getQueryData<Quiz[]>(key);
    queryClient.setQueryData<Quiz[]>(key, (prev) =>
      (prev ?? []).map((q) => (q.id === quiz.id ? { ...q, is_draft: nextDraft } : q))
    );
    updateMutation.mutate(
      { quizId: quiz.id, input: { is_draft: nextDraft } },
      {
        onSuccess: () => {
          toast.success(nextDraft ? 'Quiz unpublished' : 'Quiz published');
        },
        onError: (e: Error) => {
          // Roll back the optimistic patch.
          if (snapshot) queryClient.setQueryData<Quiz[]>(key, snapshot);
          toast.error(e.message);
        },
      }
    );
  };

  const handleDuplicate = (quiz: Quiz) => {
    duplicateMutation.mutate(quiz.id, {
      onSuccess: () => toast.success(`Duplicated "${quiz.title}" as a draft`),
      onError: (e: Error) => toast.error(e.message),
    });
  };

  // ── Bulk actions ──────────────────────────────────────────────────────────
  // Each runs N requests in parallel via Promise.allSettled — partial
  // failures still report what worked. We let React Query refetch the list
  // once, after the whole batch settles, instead of invalidating per call.
  const runBulk = async (
    label: string,
    op: (id: number) => Promise<unknown>
  ) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const results = await Promise.allSettled(ids.map(op));
    const okCount = results.filter((r) => r.status === 'fulfilled').length;
    const failCount = results.length - okCount;
    queryClient.invalidateQueries({ queryKey: quizKeys.list(courseId) });
    queryClient.invalidateQueries({ queryKey: quizKeys.available(courseId) });
    if (failCount === 0) {
      toast.success(`${label} ${okCount} quiz${okCount === 1 ? '' : 'zes'}`);
    } else if (okCount === 0) {
      toast.error(`Failed to ${label.toLowerCase()} ${failCount} quiz${failCount === 1 ? '' : 'zes'}`);
    } else {
      toast.warning(`${label} ${okCount}, failed ${failCount}`);
    }
    clearSelection();
  };

  const handleBulkPublish = (draft: boolean) =>
    runBulk(draft ? 'Unpublished' : 'Published', (id) =>
      updateQuiz(id, { is_draft: draft })
    );
  const handleBulkDelete = () =>
    runBulk('Deleted', (id) => deleteQuizCall(id));

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
  //   - previewing:       switches to the student attempt UI in preview mode
  const [settingsTarget, setSettingsTarget] = useState<Quiz | 'create' | null>(null);
  const [editingQuestions, setEditingQuestions] = useState<Quiz | null>(null);
  const [viewingAttempts, setViewingAttempts] = useState<Quiz | null>(null);
  const [previewing, setPreviewing] = useState<Quiz | null>(null);
  // Reusable question bank manager — opens from a header button.
  const [bankOpen, setBankOpen] = useState(false);
  // AI "generate a whole quiz" dialog — opens from a header button. On
  // success it creates a draft quiz and we drop straight into the builder.
  const [aiQuizOpen, setAiQuizOpen] = useState(false);
  // Bulk-selection state. A Set<number> of selected quiz ids; an empty set
  // means "no selection mode active" and the action bar is hidden.
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

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

  if (previewing) {
    // Synthesize a QuizStartResponse from the teacher's quiz payload — no
    // backend round-trip, no DB rows. Attempt id of -1 is a sentinel; the
    // StudentAttempt component never sends it anywhere because previewMode
    // gates all network calls.
    const previewData: QuizStartResponse = {
      attempt: {
        id: -1,
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + previewing.duration_minutes * 60_000).toISOString(),
        violations_count: 0,
        warnings_shown: 0,
      },
      serverTime: new Date().toISOString(),
      quiz: {
        id: previewing.id,
        title: previewing.title,
        duration_minutes: previewing.duration_minutes,
        passing_score: previewing.passing_score,
        timing_mode: previewing.timing_mode,
        open_at: previewing.open_at,
        close_at: previewing.close_at,
      },
      questions: (previewing.questions ?? []).map((q) => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        points: q.points,
        order_index: q.order_index,
        options: q.options.map((o) => ({ id: o.id, option_text: o.option_text })),
      })),
      savedAnswers: [],
      totalQuestions: previewing.questions?.length ?? 0,
      totalPoints: (previewing.questions ?? []).reduce((s, q) => s + q.points, 0),
    };
    return (
      <div className='space-y-3'>
        <Button variant='ghost' onClick={() => setPreviewing(null)} className='gap-1'>
          <ArrowLeft className='w-4 h-4' /> Back
        </Button>
        <StudentAttempt
          data={previewData}
          previewMode
          onClosePreview={() => setPreviewing(null)}
          onSubmitted={() => setPreviewing(null)}
        />
      </div>
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
          <Button
            variant='outline'
            onClick={() => setAiQuizOpen(true)}
            className='gap-1'
          >
            <Sparkles className='w-4 h-4' /> Generate with AI
          </Button>
          <Button onClick={() => setSettingsTarget('create')} className='gap-1'>
            <Plus className='w-4 h-4' /> New quiz
          </Button>
        </div>
      </div>

      {/* Bulk action bar — appears only when at least one quiz is selected.
          Sticky so it stays accessible as the teacher scrolls through many
          chapters. The "Select all" toggle picks every visible quiz; an
          empty selection collapses the bar. */}
      {selectedIds.size > 0 && (
        <div className='sticky top-0 z-10 -mx-1 px-1 pb-2 pt-1 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70'>
          <div className='border rounded-xl p-2.5 shadow-sm bg-card flex items-center justify-between gap-3 flex-wrap'>
            <div className='flex items-center gap-3 min-w-0'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  // Select-all toggles between "all selected" and "none".
                  if (selectedIds.size === sorted.length) clearSelection();
                  else setSelectedIds(new Set(sorted.map((q) => q.id)));
                }}
                className='gap-1'
              >
                {selectedIds.size === sorted.length ? (
                  <CheckSquare className='w-4 h-4' />
                ) : (
                  <Square className='w-4 h-4' />
                )}
                {selectedIds.size === sorted.length ? 'Deselect all' : 'Select all'}
              </Button>
              <p className='text-sm tabular-nums'>
                {selectedIds.size} selected
              </p>
            </div>
            <div className='flex gap-2 flex-wrap'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handleBulkPublish(false)}
                className='gap-1'
              >
                <Check className='w-3.5 h-3.5' /> Publish
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handleBulkPublish(true)}
                className='gap-1'
              >
                Unpublish
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={handleBulkDelete}
                className='gap-1 text-destructive hover:text-destructive'
              >
                <Trash2 className='w-3.5 h-3.5' /> Delete
              </Button>
              <Button variant='ghost' size='sm' onClick={clearSelection}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

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
                    onTogglePublish={() => togglePublish(q)}
                    onDuplicate={() => handleDuplicate(q)}
                    onPreview={() => setPreviewing(q)}
                    selected={selectedIds.has(q.id)}
                    onToggleSelect={() => toggleSelect(q.id)}
                    anySelected={selectedIds.size > 0}
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
              onTogglePublish={() => togglePublish(q)}
              onDuplicate={() => handleDuplicate(q)}
              onPreview={() => setPreviewing(q)}
              selected={selectedIds.has(q.id)}
              onToggleSelect={() => toggleSelect(q.id)}
              anySelected={selectedIds.size > 0}
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

      {/* AI "generate a whole quiz" flow. On success it creates a draft quiz
          (seeded with the kept questions) and drops the teacher straight into
          the builder to fine-tune + publish. */}
      <AiGenerateDialog
        open={aiQuizOpen}
        onOpenChange={setAiQuizOpen}
        courseOfferingId={courseId}
        destination={{ kind: 'new-quiz' }}
        onQuizCreated={(quiz) => setEditingQuestions(quiz)}
      />
    </div>
  );
}

/// Single quiz row in the teacher list. Extracted so both the grouped and
/// flat-list code paths render identically and a future tweak doesn't need
/// to be done twice.
///
/// Layout rationale:
///   - Primary action  = "Questions" (the most common click — adding/editing
///     content). Surfaced as a solid button.
///   - Secondary actions (Attempts) = outline button — used less often but
///     still common enough to deserve one-click access.
///   - Long-tail actions (Settings, Duplicate, Delete) collapse into a
///     dropdown so the card stays scannable. Settings is one click deeper,
///     but it's a relatively rare operation once a quiz is live.
///   - The publish switch lives top-right with a tooltip so teachers can
///     flip Draft ⇄ Published without opening Settings.
function TeacherQuizCard({
  quiz: q,
  onSettings,
  onEditQuestions,
  onViewAttempts,
  onDelete,
  onTogglePublish,
  onDuplicate,
  onPreview,
  selected,
  onToggleSelect,
  anySelected
}: {
  quiz: Quiz;
  onSettings: () => void;
  onEditQuestions: () => void;
  onViewAttempts: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
  onDuplicate: () => void;
  onPreview: () => void;
  selected: boolean;
  onToggleSelect: () => void;
  /// True when ANY row in the list is selected — controls whether the
  /// selection checkbox shows by default or only on hover. Hover-only when
  /// nothing's selected keeps the card uncluttered; always-visible once the
  /// teacher is "in selection mode" makes it easier to pick more.
  anySelected: boolean;
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
  const attemptsCount = q._count?.attempts ?? 0;
  // Empty-quiz cue — students see this as disabled "Empty quiz", and the
  // teacher card surfaces it as a destructive border + nudge so they know
  // to add questions before publishing.
  const isEmpty = questionCount === 0;

  return (
    <div
      className={`group border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:bg-muted/30 focus-within:ring-2 focus-within:ring-primary/40 ${
        isEmpty && !q.is_draft ? 'border-warning' : ''
      } ${selected ? 'ring-2 ring-primary/50 bg-primary/[0.02]' : ''}`}
    >
      {/* Selection checkbox — shown on hover, or always when selection mode
          is active. Clicking the checkbox triggers selection; clicking
          anywhere else on the card doesn't, so the standard action buttons
          still work normally. */}
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
          <p className='font-medium truncate'>{q.title}</p>
          {/* Status badges — kept compact. Window state is one badge max
              (scheduled / open / closed), is_draft is independent of the
              window so it can stack with any of them. */}
          {q.is_draft ? (
            <Badge variant='secondary' className='text-[10px]'>
              Draft
            </Badge>
          ) : (
            windowState && (
              <Badge
                variant={windowState === 'closed' ? 'destructive' : 'outline'}
                className={`text-[10px] capitalize ${
                  windowState === 'open'
                    ? 'text-success border-success'
                    : ''
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
          {q.duration_minutes} min · pass ≥ {q.passing_score}% · {q.max_attempts}{' '}
          attempt{q.max_attempts === 1 ? '' : 's'} · {questionCount} question
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

      <div className='flex items-center gap-2 shrink-0 self-stretch sm:self-auto'>
        {/* Publish switch — labelled for accessibility and tooltip-y enough
            on its own. Switching `is_draft` flips the badge above too via
            the optimistic patch in the parent. */}
        <label
          className='flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none whitespace-nowrap'
          title={
            q.is_draft
              ? 'Currently a draft — students cannot see this quiz'
              : 'Currently published — visible to students'
          }
        >
          <Switch
            checked={!q.is_draft}
            onCheckedChange={onTogglePublish}
            aria-label={
              q.is_draft
                ? `Publish ${q.title}`
                : `Unpublish ${q.title}`
            }
          />
          <span className='hidden sm:inline'>
            {q.is_draft ? 'Draft' : 'Published'}
          </span>
        </label>

        <Button
          size='sm'
          onClick={onEditQuestions}
          aria-label={`Edit questions on ${q.title}`}
          className='gap-1'
        >
          <Pencil className='w-3.5 h-3.5' /> Questions
        </Button>
        <Button
          variant='outline'
          size='sm'
          onClick={onViewAttempts}
          aria-label={
            (q.pendingGradingCount ?? 0) > 0
              ? `View attempts on ${q.title} — ${q.pendingGradingCount} need grading`
              : `View attempts on ${q.title}`
          }
          className='relative'
        >
          Attempts
          {attemptsCount > 0 && (
            <span className='ml-1 text-[10px] text-muted-foreground tabular-nums'>
              {attemptsCount}
            </span>
          )}
          {/* Pending-grading pill — bumps the attempt count to the side so
              the teacher can spot quizzes that need their attention from a
              long list at a glance. Hidden when 0. */}
          {(q.pendingGradingCount ?? 0) > 0 && (
            <span
              className='ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold tabular-nums bg-destructive text-destructive-foreground'
              title={`${q.pendingGradingCount} attempt${q.pendingGradingCount === 1 ? '' : 's'} need grading`}
            >
              {q.pendingGradingCount}
            </span>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              aria-label={`More actions for ${q.title}`}
            >
              <MoreHorizontal className='w-4 h-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-48'>
            <DropdownMenuLabel className='text-xs text-muted-foreground'>
              Manage quiz
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={onPreview}
              disabled={isEmpty}
              className='gap-2'
            >
              <Eye className='w-4 h-4' /> Preview as student
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSettings} className='gap-2'>
              <Settings className='w-4 h-4' /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate} className='gap-2'>
              <Copy className='w-4 h-4' /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className='gap-2 text-destructive focus:text-destructive'
            >
              <Trash2 className='w-4 h-4' /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function CourseQuizzes({ courseId, isStudent }: CourseQuizzesProps) {
  return isStudent ? <StudentView courseId={courseId} /> : <TeacherView courseId={courseId} />;
}
