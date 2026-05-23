import { apiClient } from '@/lib/api-client';
import type {
  CreateQuestionInput,
  CreateQuizInput,
  ExportQuizCsvResponse,
  GradedAnswerInput,
  ImportQuizCsvInput,
  ImportQuizCsvResponse,
  Quiz,
  QuizAttempt,
  QuizAttemptAnswer,
  QuizQuestion,
  QuizStartResponse,
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

export async function getQuizAttempts(quizId: number): Promise<QuizAttempt[]> {
  return apiClient<QuizAttempt[]>(`/quizzes/${quizId}/attempts`);
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
