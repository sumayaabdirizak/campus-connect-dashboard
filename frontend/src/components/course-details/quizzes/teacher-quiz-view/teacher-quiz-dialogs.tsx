'use client';

import { toast } from 'sonner';
import { QuizSettingsDialog } from '../quiz-settings-form';
import type {
  CreateQuizInput,
  Quiz,
  UpdateQuizInput,
} from '@/lib/course-details/services/quizzes-types';

type MutateCreate = (
  data: CreateQuizInput,
  opts: { onSuccess: () => void; onError: (e: Error) => void }
) => void;

type MutateUpdate = (
  args: { quizId: number; input: UpdateQuizInput },
  opts: { onSuccess: () => void; onError: (e: Error) => void }
) => void;

export function TeacherQuizDialogs({
  settingsTarget,
  liveEditing,
  pending,
  quizzes = [],
  mutateCreate,
  mutateUpdate,
  onCloseSettings,
}: {
  settingsTarget: Quiz | null;
  liveEditing: Quiz | null;
  pending: boolean;
  quizzes?: Quiz[];
  mutateCreate: MutateCreate;
  mutateUpdate: MutateUpdate;
  onCloseSettings: () => void;
}) {
  const handleSettingsSubmit = (
    payload:
      | { mode: 'create'; data: CreateQuizInput }
      | { mode: 'edit'; quizId: number; data: UpdateQuizInput }
  ) => {
    if (payload.mode === 'create') {
      mutateCreate(payload.data, {
        onSuccess: () => {
          toast.success('Quiz created');
          onCloseSettings();
        },
        onError: (e: Error) => toast.error(e.message),
      });
    } else {
      mutateUpdate(
        { quizId: payload.quizId, input: payload.data },
        {
          onSuccess: () => {
            toast.success('Quiz updated');
            onCloseSettings();
          },
          onError: (e: Error) => toast.error(e.message),
        }
      );
    }
  };

  return (
    <QuizSettingsDialog
      open={settingsTarget !== null}
      onOpenChange={(open) => !open && onCloseSettings()}
      editing={liveEditing}
      pending={pending}
      existingQuizzes={quizzes}
      onSubmit={handleSettingsSubmit}
    />
  );
}
