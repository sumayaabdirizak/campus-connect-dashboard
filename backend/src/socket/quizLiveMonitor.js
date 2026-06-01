// ─── Quiz live-monitor socket helpers ─────────────────────────────────────
//
// Emits real-time progress events on the `quiz:${quizId}:monitor` room so
// the teacher's monitoring dashboard sees in-flight attempts update without
// polling. We deliberately keep payloads minimal — just the deltas needed
// to refresh the tile — so a noisy autosave loop doesn't saturate the wire.
//
// Event taxonomy (all on the same `quiz:progress` channel, distinguished by
// `kind`):
//   • 'started'   — student began (or resumed) an attempt
//   • 'answer'    — autosave fired; includes answeredCount delta
//   • 'violation' — anti-cheating signal counted (visibility/copy/paste/etc)
//   • 'submitted' — attempt finalized (manual submit, time expiry, or
//                    auto-close on violation threshold)
//
// All payloads share a baseline shape so the client reducer can merge them
// into a single per-student tile without type-narrowing in three places.

import { getIo } from "./hub.js";

function monitorRoom(quizId) {
  return `quiz:${Number(quizId)}:monitor`;
}

/**
 * Internal — fan an event payload out to every teacher subscribed to this
 * quiz. No-op if socket.io isn't initialized (jobs running outside the
 * server context, e.g. tests).
 */
function emit(quizId, payload) {
  const io = getIo();
  if (!io) return;
  io.to(monitorRoom(quizId)).emit("quiz:progress", {
    quizId: Number(quizId),
    ts: new Date().toISOString(),
    ...payload,
  });
}

export function emitStarted({ quizId, attempt, student }) {
  emit(quizId, {
    kind: "started",
    attemptId: attempt.id,
    studentId: attempt.studentId,
    student: student ? { id: student.id, full_name: student.full_name, number: student.number } : null,
    started_at: attempt.started_at,
    expires_at: attempt.expires_at,
    violations_count: attempt.violations_count ?? 0,
  });
}

export function emitAnswerSaved({ quizId, attemptId, studentId, answeredCount, currentQuestionId }) {
  emit(quizId, {
    kind: "answer",
    attemptId,
    studentId,
    answeredCount,
    currentQuestionId: currentQuestionId ?? null,
  });
}

export function emitViolation({ quizId, attemptId, studentId, violations_count, kind, auto_closed }) {
  emit(quizId, {
    kind: "violation",
    attemptId,
    studentId,
    violations_count,
    violationKind: kind,
    auto_closed: !!auto_closed,
  });
}

export function emitSubmitted({ quizId, attempt, closureReason }) {
  emit(quizId, {
    kind: "submitted",
    attemptId: attempt.id,
    studentId: attempt.studentId,
    submitted_at: attempt.submitted_at,
    score: attempt.score ?? null,
    closure_reason: closureReason ?? attempt.closure_reason ?? null,
  });
}
