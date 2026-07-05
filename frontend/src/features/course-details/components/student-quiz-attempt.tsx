'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  Check,
  Clock,
  CloudOff,
  Eye,
  Keyboard,
  Loader2,
  ShieldAlert,
  Sparkles,
  XCircle
} from 'lucide-react';
import {
  AUTOSAVE_DEBOUNCE_MS,
  formatSeconds,
  QUIZ_API_BASE,
  readCsrfCookie
} from './course-quizzes-utils';
import { useAuthStore } from '@/lib/auth-store';
import {
  enqueueAnswers,
  drainPending,
  getAllPending,
  requestBackgroundSync,
} from '../api/quiz-offline-queue';
import { toast } from 'sonner';
import {
  useReportViolation,
  useSaveAttemptAnswers,
  useSubmitQuiz,
} from '../api/quizzes-queries';
import type { QuizAttempt, QuizAttemptAnswer, QuizStartResponse } from '../api/quizzes-types';

export function StudentAttempt({
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