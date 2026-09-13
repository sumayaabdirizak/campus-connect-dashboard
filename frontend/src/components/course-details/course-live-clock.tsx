'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useServerNowTick } from '@/lib/use-server-now-tick';
import { serverNow } from '@/lib/server-clock';

const CourseLiveClockContext = createContext<number>(0);

/** One shared 1s tick for all course-detail timing UI (assignments, quizzes, etc.). */
export function CourseLiveClockProvider({ children }: { children: ReactNode }) {
  const now = useServerNowTick(1000, true);
  return (
    <CourseLiveClockContext.Provider value={now}>{children}</CourseLiveClockContext.Provider>
  );
}

/** Subscribe so the component re-renders every second with fresh server time. */
export function useCourseLiveNow(): number {
  const ctx = useContext(CourseLiveClockContext);
  return ctx || serverNow();
}
