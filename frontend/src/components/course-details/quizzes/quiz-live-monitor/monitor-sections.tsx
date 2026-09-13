import { Badge } from '@/components/ui/badge';
import {
  Activity,
  ChevronDown,
  Radio,
  Wifi,
  WifiOff
} from 'lucide-react';
import type { LiveAttemptTile } from '@/lib/course-details/queries/use-quiz-live-monitor';
import { LiveTile } from './live-tile';

interface QuizLiveMonitorHeaderProps {
  collapsed: boolean;
  onToggle: () => void;
  isConnected: boolean;
  joined: boolean;
  inProgressCount: number;
  submittedNowCount: number;
}

export function QuizLiveMonitorHeader({
  collapsed,
  onToggle,
  isConnected,
  joined,
  inProgressCount,
  submittedNowCount
}: QuizLiveMonitorHeaderProps) {
  return (
    <button
      type='button'
      onClick={onToggle}
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
  );
}

export function QuizLiveMonitorBody({ tiles }: { tiles: LiveAttemptTile[] }) {
  if (tiles.length === 0) {
    return (
      <div className='text-center py-8 text-sm text-muted-foreground space-y-1'>
        <Activity className='w-6 h-6 mx-auto opacity-40' />
        <p>No students are taking this quiz right now.</p>
        <p className='text-[11px]'>
          As soon as someone clicks Start, their tile will appear here in real-time.
        </p>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2'>
      {tiles.map((t) => (
        <LiveTile key={t.attemptId} tile={t} />
      ))}
    </div>
  );
}
