'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

import { getSocketUrl } from '@/lib/api-config';

const SOCKET_URL = getSocketUrl();

/// One row per in-flight student attempt. The reducer below builds these
/// from the streamed `quiz:progress` events. Once an attempt receives a
/// `submitted` event we keep the row for a few seconds (so the teacher sees
/// the final state flip in place) before garbage-collecting it on the next
/// `started` for that student.
export interface LiveAttemptTile {
  attemptId: number;
  studentId: number;
  studentName: string;
  studentNumber?: string | null;
  /// 'in_progress' until a submitted event lands. After that, the closure
  /// reason (or 'submitted' for a clean manual submit) drives the badge.
  status: 'in_progress' | 'submitted' | 'auto_closed_violations' | 'time_expired';
  startedAt: string;
  expiresAt: string | null;
  /// Most recent question id the student touched (from autosave). Drives
  /// the "currently on Q3" pill on the tile.
  currentQuestionId: number | null;
  answeredCount: number;
  violationsCount: number;
  /// Timestamp of the last event we saw — used to render "active 12s ago"
  /// and to highlight idle students.
  lastActivityAt: string;
  /// Final score (only set after a submitted event lands).
  score?: number | null;
}

export type LiveProgressEvent =
  | {
      kind: 'started';
      quizId: number; ts: string;
      attemptId: number; studentId: number;
      student: { id: number; full_name: string; number?: string | null } | null;
      started_at: string; expires_at: string | null;
      violations_count: number;
    }
  | {
      kind: 'answer';
      quizId: number; ts: string;
      attemptId: number; studentId: number;
      answeredCount: number; currentQuestionId: number | null;
    }
  | {
      kind: 'violation';
      quizId: number; ts: string;
      attemptId: number; studentId: number;
      violations_count: number; violationKind: string; auto_closed: boolean;
    }
  | {
      kind: 'submitted';
      quizId: number; ts: string;
      attemptId: number; studentId: number;
      submitted_at: string; score: number | null;
      closure_reason: string | null;
    };

interface UseQuizLiveMonitorResult {
  isConnected: boolean;
  /// Map of attemptId → tile. Sorted view should be derived in the
  /// component (by lastActivityAt desc, by studentName, etc.).
  tiles: LiveAttemptTile[];
  /// True iff the teacher's role was accepted by the server. False means
  /// the join was rejected (e.g. RBAC failed) — surface a tasteful error.
  joined: boolean;
  error: string | null;
}

/**
 * Subscribe to a quiz's real-time progress feed. Only callable from the
 * teacher monitoring UI — students don't have join permission server-side
 * (returns `{ joined: false, error: 'forbidden' }` if a student tries).
 *
 * The hook owns its own socket connection so we don't tangle with the chat
 * socket lifecycle. Reconnects automatically on network drops.
 */
export function useQuizLiveMonitor(quizId: number | null): UseQuizLiveMonitorResult {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /// Map keyed by attemptId so repeated answer/violation events for the
  /// same attempt merge into a single row instead of stacking up.
  const [byAttempt, setByAttempt] = useState<Map<number, LiveAttemptTile>>(new Map());

  useEffect(() => {
    if (!quizId) return;
    setJoined(false);
    setError(null);

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Ask the server to add us to the quiz monitor room. The ack callback
      // returns either {ok:true, room} or {ok:false, error: '...'} so we
      // can surface RBAC / not-found errors inline.
      socket.emit('quiz:monitor:join', quizId, (resp: { ok: boolean; error?: string }) => {
        if (resp?.ok) {
          setJoined(true);
          setError(null);
        } else {
          setJoined(false);
          setError(resp?.error ?? 'join_failed');
        }
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setJoined(false);
    });

    socket.on('quiz:progress', (e: LiveProgressEvent) => {
      if (e.quizId !== quizId) return;
      setByAttempt((prev) => {
        const next = new Map(prev);
        const existing = next.get(e.attemptId);
        if (e.kind === 'started') {
          next.set(e.attemptId, {
            attemptId: e.attemptId,
            studentId: e.studentId,
            studentName: e.student?.full_name ?? `Student #${e.studentId}`,
            studentNumber: e.student?.number ?? null,
            status: 'in_progress',
            startedAt: e.started_at,
            expiresAt: e.expires_at,
            currentQuestionId: existing?.currentQuestionId ?? null,
            answeredCount: existing?.answeredCount ?? 0,
            violationsCount: e.violations_count ?? 0,
            lastActivityAt: e.ts,
          });
        } else if (e.kind === 'answer' && existing) {
          next.set(e.attemptId, {
            ...existing,
            answeredCount: e.answeredCount,
            currentQuestionId: e.currentQuestionId,
            lastActivityAt: e.ts,
          });
        } else if (e.kind === 'violation' && existing) {
          next.set(e.attemptId, {
            ...existing,
            violationsCount: e.violations_count,
            lastActivityAt: e.ts,
            // auto_closed is followed by a `submitted` event with the
            // closure reason, so we don't flip status here.
          });
        } else if (e.kind === 'submitted' && existing) {
          const status: LiveAttemptTile['status'] =
            e.closure_reason === 'violations'
              ? 'auto_closed_violations'
              : e.closure_reason === 'time_expired'
                ? 'time_expired'
                : 'submitted';
          next.set(e.attemptId, {
            ...existing,
            status,
            score: e.score,
            lastActivityAt: e.ts,
          });
        }
        return next;
      });
    });

    return () => {
      socket.emit('quiz:monitor:leave', quizId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [quizId]);

  const tiles = useMemo(() => {
    return Array.from(byAttempt.values()).sort((a, b) => {
      // In-progress first, then most-recently-active first within each group.
      const aPriority = a.status === 'in_progress' ? 0 : 1;
      const bPriority = b.status === 'in_progress' ? 0 : 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
    });
  }, [byAttempt]);

  return { isConnected, joined, error, tiles };
}
