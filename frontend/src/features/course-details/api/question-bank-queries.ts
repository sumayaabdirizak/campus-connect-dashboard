import { useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import {
  createBankQuestion,
  deleteBankQuestion,
  generateQuestions,
  getBankQuestions,
  getBankTopics,
  importBankQuestions,
  importBankQuestionsToQuiz,
  updateBankQuestion
} from './question-bank-service';
import type {
  BankQuestionFilters,
  CreateBankQuestionInput,
  GenerateQuestionsInput,
  ImportToQuizInput,
  UpdateBankQuestionInput
} from './question-bank-types';
import { quizKeys } from './quizzes-queries';

export const bankKeys = {
  all: ['question-bank'] as const,
  list: (courseOfferingId: string, filters?: BankQuestionFilters) =>
    [...bankKeys.all, 'list', courseOfferingId, filters ?? {}] as const,
  topics: (courseOfferingId: string) =>
    [...bankKeys.all, 'topics', courseOfferingId] as const
};

export function useBankQuestions(courseOfferingId: string, filters?: BankQuestionFilters) {
  return useQuery({
    queryKey: bankKeys.list(courseOfferingId, filters),
    queryFn: () => getBankQuestions(courseOfferingId, filters)
  });
}

export function useBankTopics(courseOfferingId: string) {
  return useQuery({
    queryKey: bankKeys.topics(courseOfferingId),
    queryFn: () => getBankTopics(courseOfferingId)
  });
}

export function useCreateBankQuestion(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBankQuestionInput) =>
      createBankQuestion(courseOfferingId, input),
    onSuccess: () => {
      // Invalidate every list variant (filter combos) so a freshly created
      // row appears in whatever view the teacher is currently looking at.
      // The topic dropdown also needs a refresh if this row introduced a
      // new topic.
      queryClient.invalidateQueries({ queryKey: bankKeys.all });
    }
  });
}

export function useUpdateBankQuestion(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      questionId,
      input
    }: {
      questionId: number;
      input: UpdateBankQuestionInput;
    }) => updateBankQuestion(courseOfferingId, questionId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankKeys.all });
    }
  });
}

export function useDeleteBankQuestion(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questionId: number) =>
      deleteBankQuestion(courseOfferingId, questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankKeys.all });
    }
  });
}

/// Bulk CSV import. The component parses the CSV client-side, validates row
/// shapes, then fires this once. Success toast counts imports, list refetches.
export function useImportBankQuestions(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questions: CreateBankQuestionInput[]) =>
      importBankQuestions(courseOfferingId, questions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankKeys.all });
    }
  });
}

/// Ask the AI to draft questions. Pure read-style mutation — no cache
/// invalidation, since nothing was persisted server-side. The teacher then
/// picks which to save via the existing import / create endpoints.
export function useGenerateQuestions(courseOfferingId: string) {
  return useMutation({
    mutationFn: (input: GenerateQuestionsInput) =>
      generateQuestions(courseOfferingId, input)
  });
}

/// Copy bank rows into an existing quiz. Invalidates both the bank (in case
/// the picker should hide just-imported rows in some future "already in
/// quiz" filter) and the quiz list, so the quiz builder sees the new
/// questions immediately on the next refetch.
export function useImportToQuiz(courseOfferingId: string, quizId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ImportToQuizInput) =>
      importBankQuestionsToQuiz(courseOfferingId, quizId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quizKeys.list(courseOfferingId) });
      queryClient.invalidateQueries({ queryKey: quizKeys.available(courseOfferingId) });
    }
  });
}
