import { Badge } from '@/components/ui/badge';
import {
  Activity,
  CheckCircle2,
  Clock,
  ShieldAlert
} from 'lucide-react';
import type { LiveAttemptTile } from '../../api/use-quiz-live-monitor';

export function LiveTile({ tile }: { tile: LiveAttemptTile }) {
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
