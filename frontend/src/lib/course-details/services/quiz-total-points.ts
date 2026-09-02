import type { Quiz } from './quizzes-types';

export function isUploadedOfflineQuiz(quiz: Quiz): boolean {
  return quiz.mode === 'offline' && quiz.offline_delivery === 'uploaded';
}

/** Built-in-app quizzes (online or built offline) with no questions yet. */
export function isQuizMissingBuiltQuestions(quiz: Quiz): boolean {
  return !isUploadedOfflineQuiz(quiz) && (quiz.questions?.length ?? 0) === 0;
}

/** Uploaded paper quiz missing its document. */
export function isUploadedQuizMissingPaper(quiz: Quiz): boolean {
  return isUploadedOfflineQuiz(quiz) && !quiz.paperFile;
}

/** Preview-as-student only applies to quizzes with in-app questions. */
export function canPreviewQuizAsStudent(quiz: Quiz): boolean {
  return (quiz.questions?.length ?? 0) > 0;
}

/** Max marks for score entry / display (paper upload uses course maxMarks). */
export function resolveQuizTotalPoints(quiz: Quiz): number {
  if (isUploadedOfflineQuiz(quiz)) {
    if ((quiz.maxMarks ?? 0) > 0) return quiz.maxMarks!;
    if ((quiz.marksPlan?.totalMarks ?? 0) > 0) return quiz.marksPlan!.totalMarks;
    return 0;
  }

  const fromQuestions = (quiz.questions ?? []).reduce(
    (sum, q) => sum + (Number(q.points) || 0),
    0
  );
  if (fromQuestions > 0) return fromQuestions;
  if ((quiz.maxMarks ?? 0) > 0) return quiz.maxMarks!;
  if ((quiz.marksPlan?.totalMarks ?? 0) > 0) return quiz.marksPlan!.totalMarks;
  return 0;
}
