'use client';

import { toast } from 'sonner';
import { AiGenerateDialog } from '../ai-generate-dialog';
import { QuestionBankManager } from '../question-bank-manager';
import { QuizSettingsDialog } from '../quiz-settings-form';
import type { CourseModule } from '../../api/resources-types';
import type {
  CreateQuizInput,
  Quiz,
  UpdateQuizInput,
} from '../../api/quizzes-types';

type MutateCreate = (
  data: CreateQuizInput,
  opts: { onSuccess: () => void; onError: (e: Error) => void }
) => void;

type MutateUpdate = (
  args: { quizId: number; input: UpdateQuizInput },
  opts: { onSuccess: () => void; onError: (e: Error) => void }
) => void;

export function TeacherQuizDialogs({
  courseId,
  settingsTarget,
  liveEditing,
  modules,
  pending,
  mutateCreate,
  mutateUpdate,
  bankOpen,
  aiQuizOpen,
  onCloseSettings,
  onBankOpenChange,
  onAiOpenChange,
  onQuizCreated,
}: {
  courseId: string;
  settingsTarget: Quiz | 'create' | null;
  liveEditing: Quiz | null;
  modules: CourseModule[];
  pending: boolean;
  mutateCreate: MutateCreate;
  mutateUpdate: MutateUpdate;
  bankOpen: boolean;
  aiQuizOpen: boolean;
  onCloseSettings: () => void;
  onBankOpenChange: (open: boolean) => void;
  onAiOpenChange: (open: boolean) => void;
  onQuizCreated: (quiz: Quiz) => void;
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
    <>
      <QuizSettingsDialog
        open={settingsTarget !== null}
        onOpenChange={(open) => !open && onCloseSettings()}
        editing={liveEditing}
        pending={pending}
        modules={modules}
        onSubmit={handleSettingsSubmit}
      />
      <QuestionBankManager
        open={bankOpen}
        onOpenChange={onBankOpenChange}
        courseOfferingId={courseId}
      />
      <AiGenerateDialog
        open={aiQuizOpen}
        onOpenChange={onAiOpenChange}
        courseOfferingId={courseId}
        destination={{ kind: 'new-quiz' }}
        onQuizCreated={onQuizCreated}
      />
    </>
  );
}
