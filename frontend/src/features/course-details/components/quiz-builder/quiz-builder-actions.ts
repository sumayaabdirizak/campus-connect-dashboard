'use client';

import { toast } from 'sonner';
import { confirmDelete, showToast } from '@/lib/notifications';
import type { QuizQuestion } from '../../api/quizzes-types';
import { draftToPayload, validateDraft } from './draft-empty';
import type { DraftQuestion } from './types';

type MutateCreate = {
  mutate: (
    payload: ReturnType<typeof draftToPayload>,
    opts: { onSuccess: () => void; onError: (e: Error) => void }
  ) => void;
};

type MutateUpdate = {
  mutate: (
    vars: { questionId: number; input: ReturnType<typeof draftToPayload> },
    opts: { onSuccess: () => void; onError: (e: Error) => void }
  ) => void;
};

type MutateDelete = {
  mutate: (
    id: number,
    opts: { onSuccess: () => void; onError: (e: Error) => void }
  ) => void;
};

export function saveDraftQuestion(opts: {
  draft: DraftQuestion | null;
  canAddQuestions: boolean;
  addLockedTitle: string;
  createMutation: MutateCreate;
  updateMutation: MutateUpdate;
  clearDraft: () => void;
}) {
  const err = validateDraft(opts.draft);
  if (err) {
    toast.error(err);
    return;
  }
  if (!opts.draft) return;
  const payload = draftToPayload(opts.draft);
  if (opts.draft.id == null && !opts.canAddQuestions) {
    toast.error(opts.addLockedTitle);
    return;
  }
  if (opts.draft.id == null) {
    opts.createMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Question added');
        opts.clearDraft();
      },
      onError: (e: Error) => toast.error(e.message)
    });
  } else {
    opts.updateMutation.mutate(
      { questionId: opts.draft.id, input: payload },
      {
        onSuccess: () => {
          toast.success('Question updated');
          opts.clearDraft();
        },
        onError: (e: Error) => toast.error(e.message)
      }
    );
  }
}

export async function deleteQuizQuestion(
  q: QuizQuestion,
  deleteMutation: MutateDelete
) {
  if (!(await confirmDelete(q.question_text.slice(0, 40)))) return;
  deleteMutation.mutate(q.id, {
    onSuccess: () => showToast('success', 'Deleted'),
    onError: (e: Error) => showToast('error', e.message)
  });
}
