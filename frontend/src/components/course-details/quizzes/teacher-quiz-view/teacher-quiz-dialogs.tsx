'use client';

import { toast } from 'sonner';
import { AiGenerateDialog } from '../ai-generate-dialog';
import { QuizSettingsDialog } from '../quiz-settings-form';
import type { CourseModule } from '@/lib/course-details/services/resources-types';
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
  courseId,
  settingsTarget,
  liveEditing,
  modules,
  pending,
  mutateCreate,
  mutateUpdate,
  aiQuizOpen,
  onCloseSettings,
  onAiOpenChange,
  onQuizCreated,
}: {
  courseId: string;
  settingsTarget: Quiz | null;
  liveEditing: Quiz | null;
  modules: CourseModule[];
  pending: boolean;
  mutateCreate: MutateCreate;
  mutateUpdate: MutateUpdate;
  aiQuizOpen: boolean;
  onCloseSettings: () => void;
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
