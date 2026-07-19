'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { confirmDelete, showToast } from '@/lib/notifications';
import {
  useBankQuestions,
  useBankTopics,
  useCreateBankQuestion,
  useDeleteBankQuestion,
  useUpdateBankQuestion
} from '../../api/question-bank-queries';
import { useModules } from '../../api/resources-queries';
import type {
  BankQuestion,
  BankQuestionFilters,
  CreateBankQuestionInput,
  UpdateBankQuestionInput
} from '../../api/question-bank-types';

export function useQuestionBankManager(courseOfferingId: string) {
  const [filters, setFilters] = useState<BankQuestionFilters>({});
  const { data: questions = [], isLoading } = useBankQuestions(courseOfferingId, filters);
  const { data: topics = [] } = useBankTopics(courseOfferingId);
  const { data: modules = [] } = useModules(courseOfferingId);
  const createMutation = useCreateBankQuestion(courseOfferingId);
  const updateMutation = useUpdateBankQuestion(courseOfferingId);
  const deleteMutation = useDeleteBankQuestion(courseOfferingId);
  const [editor, setEditor] = useState<BankQuestion | 'new' | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);

  const handleCreateOrUpdate = (payload: CreateBankQuestionInput) => {
    if (editor === 'new' || editor === null) {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('Question added to bank');
          setEditor(null);
        },
        onError: (e: Error) => toast.error(e.message)
      });
    } else {
      updateMutation.mutate(
        { questionId: editor.id, input: payload as UpdateBankQuestionInput },
        {
          onSuccess: () => {
            toast.success('Question updated');
            setEditor(null);
          },
          onError: (e: Error) => toast.error(e.message)
        }
      );
    }
  };

  const handleDelete = async (q: BankQuestion) => {
    if (!(await confirmDelete(q.question_text.slice(0, 60)))) return;
    deleteMutation.mutate(q.id, {
      onSuccess: () => showToast('success', 'Question deleted'),
      onError: (e: Error) => showToast('error', e.message)
    });
  };

  return {
    filters,
    setFilters,
    questions,
    isLoading,
    topics,
    modules,
    editor,
    setEditor,
    csvOpen,
    setCsvOpen,
    handleCreateOrUpdate,
    handleDelete,
    formPending: createMutation.isPending || updateMutation.isPending
  };
}
