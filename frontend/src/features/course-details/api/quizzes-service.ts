import { apiClient } from '@/lib/api-client';
import type {
  CreateQuestionInput,
  CreateQuizInput,
  ExportQuizCsvResponse,
  GradedAnswerInput,
  ImportQuizCsvInput,
  ImportQuizCsvResponse,
  Quiz,
  QuizAnalytics,
  QuizAttempt,
  QuizAttemptAnswer,
  QuizQuestion,
  QuizStartResponse,
  ReportViolationResponse,
  SaveAttemptAnswersResponse,
  UpdateQuestionInput,
  UpdateQuizInput
} from './quizzes-types';

export async function getQuizzesForOffering(courseOfferingId: string): Promise<Quiz[]> {
  return apiClient<Quiz[]>(`/quizzes/${courseOfferingId}`);
}

export async function getAvailableQuizzes(courseOfferingId: string): Promise<Quiz[]> {
  return apiClient<Quiz[]>(`/quiz-taking/${courseOfferingId}/available`);
}

export async function createQuiz(
  courseOfferingId: string,
  input: CreateQuizInput
): Promise<Quiz> {
  return apiClient<Quiz>(`/quizzes/${courseOfferingId}`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function updateQuiz(quizId: number, input: UpdateQuizInput): Promise<Quiz> {
  return apiClient<Quiz>(`/quizzes/${quizId}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export async function deleteQuiz(quizId: number): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>(`/quizzes/${quizId}`, { method: 'DELETE' });
}

/// Deep-clone a quiz (including all questions + options). Backend returns
/// the freshly-created draft; the caller invalidates the quiz list so it
/// appears in the UI without an extra fetch.
export async function duplicateQuiz(quizId: number): Promise<Quiz> {
  return apiClient<Quiz>(`/quizzes/${quizId}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}

export async function getQuizAttempts(quizId: number): Promise<QuizAttempt[]> {
  return apiClient<QuizAttempt[]>(`/quizzes/${quizId}/attempts`);
}

/// Per-question analytics aggregated over every submitted attempt. The
/// component caches with the attempts list because the same teacher action
/// (manual grade save) invalidates both.
export async function getQuizAnalytics(quizId: number): Promise<QuizAnalytics> {
  return apiClient<QuizAnalytics>(`/quizzes/${quizId}/analytics`);
}

/// Teacher-side: PATCH grades for one or more short-answer responses on an
/// attempt. The backend re-sums total earned points from the DB after each
/// grade write — we don't need to send the running total.
export async function gradeAttempt(
  attemptId: number,
  answers: GradedAnswerInput[]
): Promise<QuizAttempt> {
  return apiClient<QuizAttempt>(`/quiz-taking/attempts/${attemptId}/grade`, {
    method: 'PATCH',
    body: JSON.stringify({ answers })
  });
}

/// Fetch a single attempt with its full quiz tree (questions, options,
/// correct answers, explanations) + the student's answers — exactly the shape
/// `AttemptReview` needs. Used to let a student re-open their results from the
/// quiz card after they've navigated away from the post-submit screen.
/// Access is scoped server-side: a student can only fetch their own attempt.
export async function getAttemptReview(attemptId: number): Promise<QuizAttempt> {
  return apiClient<QuizAttempt>(`/quiz-taking/attempts/${attemptId}`);
}

export async function startQuiz(quizId: number): Promise<QuizStartResponse> {
  return apiClient<QuizStartResponse>(`/quiz-taking/${quizId}/start`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}

export async function submitQuiz(
  quizId: number,
  attemptId: number,
  answers: QuizAttemptAnswer[]
): Promise<QuizAttempt> {
  return apiClient<QuizAttempt>(`/quizzes/${quizId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ attemptId, answers })
  });
}

/// Report a cheating signal (tab leave, copy, paste, …) on an in-progress
/// attempt. Server increments the counter and — at the 3rd violation —
/// finalizes the attempt itself, signaling that via `auto_closed: true`.
/// `kind` is a short label persisted only in server logs for forensics.
export async function reportViolation(
  attemptId: number,
  kind: string
): Promise<ReportViolationResponse> {
  return apiClient<ReportViolationResponse>(
    `/quiz-taking/attempts/${attemptId}/violation`,
    {
      method: 'POST',
      body: JSON.stringify({ kind })
    }
  );
}

/// Debounced autosave of in-progress answers. The server writes them as
/// ungraded rows; scoring happens at submit (or auto-submit on expiry).
export async function saveAttemptAnswers(
  attemptId: number,
  answers: QuizAttemptAnswer[]
): Promise<SaveAttemptAnswersResponse> {
  return apiClient<SaveAttemptAnswersResponse>(
    `/quiz-taking/attempts/${attemptId}/answers`,
    {
      method: 'PUT',
      body: JSON.stringify({ answers })
    }
  );
}

export async function createQuestion(
  quizId: number,
  input: CreateQuestionInput
): Promise<QuizQuestion> {
  return apiClient<QuizQuestion>(`/quizzes/${quizId}/questions`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function updateQuestion(
  questionId: number,
  input: UpdateQuestionInput
): Promise<QuizQuestion> {
  return apiClient<QuizQuestion>(`/quizzes/questions/${questionId}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export async function deleteQuestion(questionId: number): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>(`/quizzes/questions/${questionId}`, {
    method: 'DELETE'
  });
}

/// Bulk reorder of questions on a quiz. `items` is the full new order; the
/// server validates that every id belongs to this quiz before writing.
export async function reorderQuestions(
  quizId: number,
  items: Array<{ id: number; order_index: number }>
): Promise<{ updated: number }> {
  return apiClient<{ updated: number }>(`/quizzes/${quizId}/questions/reorder`, {
    method: 'POST',
    body: JSON.stringify({ items })
  });
}

/// Download the quiz's questions as CSV. Server serializes so the layout is
/// identical across clients (browser, curl, future mobile app). The frontend
/// uses the `csv` field with `downloadCsv()` to trigger a browser save.
export async function exportQuizCsv(quizId: number): Promise<ExportQuizCsvResponse> {
  return apiClient<ExportQuizCsvResponse>(`/quizzes/${quizId}/export`);
}

/// Import N questions into a quiz from a parsed CSV payload. Rows are
/// APPENDED (never replace existing questions) so the import is purely
/// additive and the teacher can't accidentally destroy hand-authored work.
export async function importQuizCsv(
  quizId: number,
  input: ImportQuizCsvInput
): Promise<ImportQuizCsvResponse> {
  return apiClient<ImportQuizCsvResponse>(`/quizzes/${quizId}/import`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}
