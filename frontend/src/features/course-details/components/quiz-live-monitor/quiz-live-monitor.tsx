'use client';

import { useEffect, useState } from 'react';
import { useQuizLiveMonitor } from '../../api/use-quiz-live-monitor';
import { QuizLiveMonitorBody, QuizLiveMonitorHeader } from './monitor-sections';

interface QuizLiveMonitorProps {
  quizId: number;
}

export function QuizLiveMonitor({ quizId }: QuizLiveMonitorProps) {
  const { isConnected, joined, error, tiles } = useQuizLiveMonitor(quizId);
  const [collapsed, setCollapsed] = useState(false);
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  const inProgressCount = tiles.filter((t) => t.status === 'in_progress').length;
  const submittedNowCount = tiles.filter((t) => t.status !== 'in_progress').length;

  if (error === 'forbidden') return null;

  return (
    <div className='rounded-xl border bg-card overflow-hidden'>
      <QuizLiveMonitorHeader
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        isConnected={isConnected}
        joined={joined}
        inProgressCount={inProgressCount}
        submittedNowCount={submittedNowCount}
      />
      {!collapsed && (
        <div className='border-t p-3'>
          <QuizLiveMonitorBody tiles={tiles} />
        </div>
      )}
    </div>
  );
}
