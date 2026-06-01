import { useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import {
  createQuestion,
  createQuiz,
  deleteQuestion,
  deleteQuiz,
  duplicateQuiz,
  exportQuizCsv,
  getAvailableQuizzes,
  getQuizAnalytics,
  getQuizAttempts,
  getQuizzesForOffering,
  gradeAttempt,
  importQuizCsv,
  reorderQuestions,
  reportViolation,
  saveAttemptAnswers,
  startQuiz,
  submitQuiz,
  updateQuestion,
  updateQuiz
} from './quizzes-service';
import type {
  CreateQuestionInput,
  CreateQuizInput,
  GradedAnswerInput,
  ImportQuizCsvInput,
  QuizAttemptAnswer,
  UpdateQuestionInput,
  UpdateQuizInput
} from './quizzes-types';

export const quizKeys = {
  all: ['quizzes'] as const,
  list: (courseOfferingId: string) => [...quizKeys.all, 'list', courseOfferingId] as const,
  available: (courseOfferingId: string) =>
    [...quizKeys.all, 'available', courseOfferingId] as const,
  attempts: (quizId: number) => [...quizKeys.all, 'attempts', quizId] as const,
  analytics: (quizId: number) => [...quizKeys.all, 'analytics', quizId] as const
};

export function useQuizzes(courseOfferingId: string) {
  return useQuery({
    queryKey: quizKeys.list(courseOfferingId),
    queryFn: () => getQuizzesForOffering(courseOfferingId)
  });
}

export function useAvailableQuizzes(courseOfferingId: string) {
  return useQuery({
    queryKey: quizKeys.available(courseOfferingId),
    queryFn: () => getAvailableQuizzes(courseOfferingId)
  });
}

export function useQuizAttempts(quizId: number | null) {
  return useQuery({
    queryKey: quizId ? quizKeys.attempts(quizId) : ['quizzes', 'attempts', 'none'],
    queryFn: () => (quizId ? getQuizAttempts(quizId) : Promise.resolve([])),
    enabled: !!quizId
  });
}

export function useQuizAnalytics(quizId: number | null) {
  return useQuery({
    queryKey: quizId ? quizKeys.analytics(quizId) : ['quizzes', 'analytics', 'none'],
    queryFn: () =>
      quizId
        ? getQuizAnalytics(quizId)
        : Promise.resolve({ totalSubmissions: 0, avgScore: null, questions: [] }),
    enabled: !!quizId
  });
}

export function useCreateQuiz(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuizInput) => createQuiz(courseOfferingId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quizKeys.list(courseOfferingId) });
      queryClient.invalidateQueries({ queryKey: quizKeys.available(courseOfferingId) });
    }
  });
}

export function useUpdateQuiz(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quizId, input }: { quizId: number; input: UpdateQuizInput }) =>
      updateQuiz(quizId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quizKeys.list(courseOfferingId) });
      queryClient.invalidateQueries({ queryKey: quizKeys.available(courseOfferingId) });
    }
  });
}

export function useDeleteQuiz(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quizId: number) => deleteQuiz(quizId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quizKeys.list(courseOfferingId) });
      queryClient.invalidateQueries({ queryKey: quizKeys.available(courseOfferingId) });
    }
  });
}

/// Deep-clone a quiz including its questions. Invalidates the same caches
/// as create so the new "Copy of …" draft slides into the list immediately.
export function useDuplicateQuiz(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quizId: number) => duplicateQuiz(quizId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quizKeys.list(courseOfferingId) });
      queryClient.invalidateQueries({ queryKey: quizKeys.available(courseOfferingId) });
    }
  });
}

export function useStartQuiz() {
  return useMutation({
    mutationFn: (quizId: number) => startQuiz(quizId)
  });
}

export function useSubmitQuiz() {
  return useMutation({
    mutationFn: ({
      quizId,
      attemptId,
      answers
    }: {
      quizId: number;
      attemptId: number;
      answers: QuizAttemptAnswer[];
    }) => submitQuiz(quizId, attemptId, answers)
  });
}

/// Cheating-signal reporter. The student component calls this on every
/// detected violation (tab leave, copy, paste). The server increments and,
/// at the 3rd, finalizes the attempt — the response's `auto_closed: true`
/// is the client's signal to render the "Session Closed" modal and route
/// to the post-submit review. No cache invalidation here — the parent
/// handles state by inspecting the mutation result.
export function useReportViolation() {
  return useMutation({
    mutationFn: ({ attemptId, kind }: { attemptId: number; kind: string }) =>
      reportViolation(attemptId, kind)
  });
}

/// Background autosave. The component fires this from a debounced effect;
/// failures are surfaced via `mutation.error` so the UI can show a discreet
/// "couldn't save — will retry" hint without interrupting the student.
export function useSaveAttemptAnswers() {
  return useMutation({
    mutationFn: ({
      attemptId,
      answers
    }: {
      attemptId: number;
      answers: QuizAttemptAnswer[];
    }) => saveAttemptAnswers(attemptId, answers)
  });
}

/// Teacher saves manual grades for short-answer responses. Invalidates the
/// attempts list so the row's "Needs grading" badge clears and the rolled-up
/// score column updates.
export function useGradeAttempt(courseOfferingId: string, quizId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      attemptId,
      answers
    }: {
      attemptId: number;
      answers: GradedAnswerInput[];
    }) => gradeAttempt(attemptId, answers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quizKeys.attempts(quizId) });
      queryClient.invalidateQueries({ queryKey: quizKeys.analytics(quizId) });
      queryClient.invalidateQueries({ queryKey: quizKeys.list(courseOfferingId) });
    }
  });
}

export function useCreateQuestion(courseOfferingId: string, quizId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuestionInput) => createQuestion(quizId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quizKeys.list(courseOfferingId) });
      queryClient.invalidateQueries({ queryKey: quizKeys.available(courseOfferingId) });
    }
  });
}

export function useUpdateQuestion(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, input }: { questionId: number; input: UpdateQuestionInput }) =>
      updateQuestion(questionId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quizKeys.list(courseOfferingId) });
      queryClient.invalidateQueries({ queryKey: quizKeys.available(courseOfferingId) });
    }
  });
}

/// Bulk reorder. The component fires this from a drag-end handler; the
/// invalidation refetches the canonical list afterwards (with the new
/// order_index). Use the `onMutate` / `onError` hooks on `mutate(...)` to
/// drive an optimistic update of the cached list — see QuizBuilder.
export function useReorderQuestions(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      quizId,
      items
    }: {
      quizId: number;
      items: Array<{ id: number; order_index: number }>;
    }) => reorderQuestions(quizId, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quizKeys.list(courseOfferingId) });
      queryClient.invalidateQueries({ queryKey: quizKeys.available(courseOfferingId) });
    }
  });
}

export function useDeleteQuestion(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questionId: number) => deleteQuestion(questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quizKeys.list(courseOfferingId) });
      queryClient.invalidateQueries({ queryKey: quizKeys.available(courseOfferingId) });
    }
  });
}

/// Download the quiz's questions as CSV. Read-style mutation — no cache
/// invalidation. The component triggers a browser file save with the
/// returned CSV body via the shared `downloadCsv()` helper.
export function useExportQuizCsv() {
  return useMutation({
    mutationFn: (quizId: number) => exportQuizCsv(quizId)
  });
}

/// Append CSV-parsed questions to a quiz. Invalidates both the offering's
/// quiz list (the builder's question count + total points refresh
/// immediately) and the available-quizzes list (in case the student-side
/// card needs to update its question count).
export function useImportQuizCsv(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      quizId,
      input
    }: {
      quizId: number;
      input: ImportQuizCsvInput;
    }) => importQuizCsv(quizId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quizKeys.list(courseOfferingId) });
      queryClient.invalidateQueries({ queryKey: quizKeys.available(courseOfferingId) });
    }
  });
}
