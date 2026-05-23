import { apiClient } from '@/lib/api-client';
import type {
  BankQuestion,
  BankQuestionFilters,
  BankTopicCount,
  CreateBankQuestionInput,
  GenerateQuestionsInput,
  GenerateQuestionsResponse,
  ImportToQuizInput,
  UpdateBankQuestionInput
} from './question-bank-types';

/// Build the `?topic=…&difficulty=…&search=…&moduleId=…` query string off the
/// filter object. Returns "" when no filters are active so a clean URL hits
/// the backend (helps the access log read like an actual call).
function buildQuery(filters?: BankQuestionFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.topic) params.set('topic', filters.topic);
  if (filters.difficulty) params.set('difficulty', filters.difficulty);
  if (filters.search) params.set('search', filters.search);
  if (filters.moduleId === 'none') params.set('moduleId', 'none');
  else if (typeof filters.moduleId === 'number') params.set('moduleId', String(filters.moduleId));
  const s = params.toString();
  return s ? `?${s}` : '';
}

export async function getBankQuestions(
  courseOfferingId: string,
  filters?: BankQuestionFilters
): Promise<BankQuestion[]> {
  return apiClient<BankQuestion[]>(
    `/question-bank/${courseOfferingId}${buildQuery(filters)}`
  );
}

export async function getBankTopics(courseOfferingId: string): Promise<BankTopicCount[]> {
  return apiClient<BankTopicCount[]>(`/question-bank/${courseOfferingId}/topics`);
}

export async function createBankQuestion(
  courseOfferingId: string,
  input: CreateBankQuestionInput
): Promise<BankQuestion> {
  return apiClient<BankQuestion>(`/question-bank/${courseOfferingId}`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function updateBankQuestion(
  courseOfferingId: string,
  questionId: number,
  input: UpdateBankQuestionInput
): Promise<BankQuestion> {
  return apiClient<BankQuestion>(`/question-bank/${courseOfferingId}/${questionId}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

/// Soft-delete. The backend sets `is_active = false` so the row is hidden
/// from the picker / list but its history (which quizzes imported it) stays
/// intact. There is no "restore" endpoint yet — re-create instead.
export async function deleteBankQuestion(
  courseOfferingId: string,
  questionId: number
): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>(
    `/question-bank/${courseOfferingId}/${questionId}`,
    { method: 'DELETE' }
  );
}

/// Bulk import (CSV pre-parsed on the client). Caps at 500 rows server-side;
/// if you need more, paginate in multiple calls.
export async function importBankQuestions(
  courseOfferingId: string,
  questions: CreateBankQuestionInput[]
): Promise<{ success: boolean; imported: number }> {
  return apiClient<{ success: boolean; imported: number }>(
    `/question-bank/${courseOfferingId}/import`,
    {
      method: 'POST',
      body: JSON.stringify({ questions })
    }
  );
}

/// Ask the AI to draft N quiz questions. Returns a transient preview the
/// teacher reviews + cherry-picks — nothing is persisted server-side. The
/// chosen subset is then saved via `importBankQuestions` (bank) or the quiz
/// builder's add flow.
export async function generateQuestions(
  courseOfferingId: string,
  input: GenerateQuestionsInput
): Promise<GenerateQuestionsResponse> {
  return apiClient<GenerateQuestionsResponse>(
    `/question-bank/${courseOfferingId}/generate`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    }
  );
}

/// Copy bank rows into an existing quiz. Returns `{ added }` so the UI can
/// toast "Added N questions" without a follow-up fetch.
export async function importBankQuestionsToQuiz(
  courseOfferingId: string,
  quizId: number,
  input: ImportToQuizInput
): Promise<{ success: boolean; added: number }> {
  return apiClient<{ success: boolean; added: number }>(
    `/question-bank/${courseOfferingId}/import/${quizId}`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    }
  );
}
