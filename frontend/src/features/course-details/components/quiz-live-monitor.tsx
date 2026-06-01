'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  Clock,
  Radio,
  ShieldAlert,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useQuizLiveMonitor, type LiveAttemptTile } from '../api/use-quiz-live-monitor';

interface QuizLiveMonitorProps {
  quizId: number;
}

/**
 * Teacher-facing live dashboard. Renders a grid of tiles, one per student
 * currently taking (or just submitted) the quiz, with status updating in
 * real-time over WebSocket. Designed to sit above the existing attempts
 * table — the table is the historical record, this is the live view.
 *
 * Empty state: when no students are taking the quiz right now, we render
 * a calm "waiting" panel with the connection indicator so the teacher
 * knows the dashboard is alive even with zero traffic.
 */
export function QuizLiveMonitor({ quizId }: QuizLiveMonitorProps) {
  const { isConnected, joined, error, tiles } = useQuizLiveMonitor(quizId);
  const [collapsed, setCollapsed] = useState(false);
  // Force re-render every 10s so the "active 12s ago" labels stay fresh
  // without each tile owning its own interval.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  const inProgressCount = tiles.filter((t) => t.status === 'in_progress').length;
  const submittedNowCount = tiles.filter((t) => t.status !== 'in_progress').length;

  if (error === 'forbidden') {
    return null; // Silently no-op for non-teachers
  }

  return (
    <div className='rounded-xl border bg-card overflow-hidden'>
      {/* Header */}
      <button
        type='button'
        onClick={() => setCollapsed((v) => !v)}
        className='w-full flex items-center justify-between gap-3 p-3 hover:bg-muted/40 transition-colors'
      >
        <div className='flex items-center gap-2'>
          <div className='relative'>
            <Radio className='w-4 h-4 text-primary' />
            {isConnected && joined && (
              <span className='absolute -top-0.5 -right-0.5 w-2 h-2 bg-success rounded-full ring-2 ring-card animate-pulse' />
            )}
          </div>
          <span className='font-semibold text-sm'>Live Monitor</span>
          {inProgressCount > 0 && (
            <Badge variant='default' className='gap-1'>
              <Activity className='w-3 h-3' />
              {inProgressCount} taking
            </Badge>
          )}
          {submittedNowCount > 0 && (
            <Badge variant='secondary'>{submittedNowCount} just finished</Badge>
          )}
        </div>
        <div className='flex items-center gap-2'>
          {isConnected ? (
            <span className='text-[11px] text-muted-foreground flex items-center gap-1'>
              <Wifi className='w-3 h-3' />
              {joined ? 'Connected' : 'Joining…'}
            </span>
          ) : (
            <span className='text-[11px] text-destructive flex items-center gap-1'>
              <WifiOff className='w-3 h-3' />
              Disconnected
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${
              collapsed ? '' : 'rotate-180'
            }`}
          />
        </div>
      </button>

      {/* Body */}
      {!collapsed && (
        <div className='border-t p-3'>
          {tiles.length === 0 ? (
            <div className='text-center py-8 text-sm text-muted-foreground space-y-1'>
              <Activity className='w-6 h-6 mx-auto opacity-40' />
              <p>No students are taking this quiz right now.</p>
              <p className='text-[11px]'>
                As soon as someone clicks Start, their tile will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2'>
              {tiles.map((t) => (
                <LiveTile key={t.attemptId} tile={t} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LiveTile({ tile }: { tile: LiveAttemptTile }) {
  // Time-remaining display. We compute on each render — when the parent
  // re-ticks every 10s this number stays fresh.
  const minLeft =
    tile.expiresAt && tile.status === 'in_progress'
      ? Math.max(0, Math.floor((new Date(tile.expiresAt).getTime() - Date.now()) / 60_000))
      : null;
  const secondsSinceActive = Math.floor(
    (Date.now() - new Date(tile.lastActivityAt).getTime()) / 1000
  );
  const isIdle = tile.status === 'in_progress' && secondsSinceActive > 60;

  const statusBadge = (() => {
    if (tile.status === 'submitted') {
      return (
        <Badge variant='success' className='gap-1'>
          <CheckCircle2 className='w-3 h-3' />
          Submitted{tile.score != null && ` · ${Math.round(tile.score)}%`}
        </Badge>
      );
    }
    if (tile.status === 'auto_closed_violations') {
      return (
        <Badge variant='destructive' className='gap-1'>
          <ShieldAlert className='w-3 h-3' />
          Auto-closed
        </Badge>
      );
    }
    if (tile.status === 'time_expired') {
      return (
        <Badge variant='destructive' className='gap-1'>
          <Clock className='w-3 h-3' />
          Time expired
        </Badge>
      );
    }
    return (
      <Badge variant='default' className='gap-1'>
        <Activity className={`w-3 h-3 ${isIdle ? '' : 'animate-pulse'}`} />
        {isIdle ? 'Idle' : 'Active'}
      </Badge>
    );
  })();

  return (
    <div
      className={`border rounded-lg p-3 space-y-2 transition-colors ${
        tile.status === 'in_progress'
          ? isIdle
            ? 'border-warning bg-warning-muted'
            : 'border-primary/30 bg-primary/[0.02]'
          : tile.status === 'auto_closed_violations'
            ? 'border-destructive/30 bg-destructive/5'
            : 'border-muted'
      }`}
    >
      <div className='flex items-start justify-between gap-2'>
        <div className='min-w-0 flex-1'>
          <p className='font-medium text-sm truncate'>{tile.studentName}</p>
          {tile.studentNumber && (
            <p className='text-[10px] text-muted-foreground tabular-nums'>
              {tile.studentNumber}
            </p>
          )}
        </div>
        {statusBadge}
      </div>

      <div className='flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums flex-wrap'>
        <span className='inline-flex items-center gap-0.5'>
          <CheckCircle2 className='w-3 h-3' />
          {tile.answeredCount} answered
        </span>
        {tile.status === 'in_progress' && minLeft !== null && (
          <>
            <span>·</span>
            <span
              className={`inline-flex items-center gap-0.5 ${
                minLeft < 5 ? 'text-destructive font-medium' : ''
              }`}
            >
              <Clock className='w-3 h-3' />
              {minLeft} min left
            </span>
          </>
        )}
        {tile.violationsCount > 0 && (
          <>
            <span>·</span>
            <span className='inline-flex items-center gap-0.5 text-destructive'>
              <ShieldAlert className='w-3 h-3' />
              {tile.violationsCount} viol.
            </span>
          </>
        )}
      </div>

      {tile.status === 'in_progress' && (
        <p className='text-[10px] text-muted-foreground'>
          {secondsSinceActive < 5
            ? 'Active just now'
            : secondsSinceActive < 60
              ? `Active ${secondsSinceActive}s ago`
              : `Idle ${Math.floor(secondsSinceActive / 60)}m`}
        </p>
      )}
    </div>
  );
}
