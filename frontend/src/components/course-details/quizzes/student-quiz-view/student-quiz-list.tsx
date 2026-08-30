'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Quiz } from '@/lib/course-details/services/quizzes-types';
import { StudentQuizCard } from './student-quiz-card';
import {
  resolveStudentQuizCardState,
  shouldAutoExpandQuiz,
  sortQuizzesForStudentGrid
} from './student-quiz-card-state';

function pickAutoExpandId(quizzes: Quiz[]): number | null {
  for (const q of quizzes) {
    const state = resolveStudentQuizCardState(q);
    if (shouldAutoExpandQuiz(state)) return q.id;
  }
  return null;
}

export function StudentQuizList({
  quizzes,
  reviewLoadingId,
  startPending,
  onOpenResults,
  onStart
}: {
  quizzes: Quiz[];
  reviewLoadingId: number | null;
  startPending: boolean;
  onOpenResults: (attemptId: number) => void;
  onStart: (quizId: number) => void;
}) {
  const sorted = useMemo(() => sortQuizzesForStudentGrid(quizzes), [quizzes]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const didAutoExpand = useRef(false);
  const quizIdsKey = quizzes.map((q) => q.id).join(',');

  useEffect(() => {
    if (didAutoExpand.current || sorted.length === 0) return;
    const id = pickAutoExpandId(sorted);
    if (id != null) {
      setExpandedId(id);
      didAutoExpand.current = true;
    }
  }, [quizIdsKey, sorted]);

  return (
    <div className='grid grid-cols-1 items-start gap-4 md:grid-cols-2'>
      {sorted.map((q) => (
        <StudentQuizCard
          key={q.id}
          quiz={q}
          expanded={expandedId === q.id}
          onExpandedChange={(open) => setExpandedId(open ? q.id : null)}
          reviewLoadingId={reviewLoadingId}
          startPending={startPending}
          onOpenResults={onOpenResults}
          onStart={() => onStart(q.id)}
        />
      ))}
    </div>
  );
}
