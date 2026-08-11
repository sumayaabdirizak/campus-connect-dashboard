import { useMutation, useQueryClient } from '@/lib/async-query';
import {
  createQuestion,
  createQuiz,
  deleteQuestion,
  deleteQuiz,
  duplicateQuiz,
  exportQuizCsv,
  gradeAttempt,
  importQuizCsv,
  reorderQuestions,
  reportViolation,
  saveAttemptAnswers,
  startQuiz,
  submitQuiz,
  updateQuestion,
  updateQuiz
} from '@/lib/course-details/services/quizzes-service';
import type {
  CreateQuestionInput,
  CreateQuizInput,
  GradedAnswerInput,
  ImportQuizCsvInput,
  QuizAttemptAnswer,
  UpdateQuestionInput,
  UpdateQuizInput
} from '@/lib/course-details/services/quizzes-types';
import { quizKeys } from './keys';

function invalidateOfferingQuizzes(
  queryClient: ReturnType<typeof useQueryClient>,
  courseOfferingId: string
) {
  queryClient.invalidateQueries({ queryKey: quizKeys.list(courseOfferingId) });
  queryClient.invalidateQueries({ queryKey: quizKeys.available(courseOfferingId) });
}

export function useCreateQuiz(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuizInput) => createQuiz(courseOfferingId, input),
    onSuccess: () => invalidateOfferingQuizzes(queryClient, courseOfferingId)
  });
}

export function useUpdateQuiz(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quizId, input }: { quizId: number; input: UpdateQuizInput }) =>
      updateQuiz(quizId, input),
    onSuccess: () => invalidateOfferingQuizzes(queryClient, courseOfferingId)
  });
}

export function useDeleteQuiz(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quizId: number) => deleteQuiz(quizId),
    onSuccess: () => invalidateOfferingQuizzes(queryClient, courseOfferingId)
  });
}

export function useDuplicateQuiz(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quizId: number) => duplicateQuiz(quizId),
    onSuccess: () => invalidateOfferingQuizzes(queryClient, courseOfferingId)
  });
}

export function useStartQuiz() {
  return useMutation({ mutationFn: (quizId: number) => startQuiz(quizId) });
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

export function useReportViolation() {
  return useMutation({
    mutationFn: ({ attemptId, kind }: { attemptId: number; kind: string }) =>
      reportViolation(attemptId, kind)
  });
}

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
    onSuccess: () => invalidateOfferingQuizzes(queryClient, courseOfferingId)
  });
}

export function useUpdateQuestion(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, input }: { questionId: number; input: UpdateQuestionInput }) =>
      updateQuestion(questionId, input),
    onSuccess: () => invalidateOfferingQuizzes(queryClient, courseOfferingId)
  });
}

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
    onSuccess: () => invalidateOfferingQuizzes(queryClient, courseOfferingId)
  });
}

export function useDeleteQuestion(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questionId: number) => deleteQuestion(questionId),
    onSuccess: () => invalidateOfferingQuizzes(queryClient, courseOfferingId)
  });
}

export function useExportQuizCsv() {
  return useMutation({ mutationFn: (quizId: number) => exportQuizCsv(quizId) });
}

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
    onSuccess: () => invalidateOfferingQuizzes(queryClient, courseOfferingId)
  });
}
