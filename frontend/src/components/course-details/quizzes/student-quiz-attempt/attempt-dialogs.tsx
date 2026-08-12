'use client';

import type { QuizAttemptAnswer } from '@/lib/course-details/services/quizzes-types';
import { RulesGateDialog } from './rules-gate-dialog';
import { ShortcutsDialog } from './shortcuts-dialog';
import { SubmitConfirmDialog } from './submit-confirm-dialog';
import {
  AutoClosedDialog,
  ViolationWarningDialog
} from './violation-modals';

export function AttemptDialogs(props: {
  previewMode: boolean;
  acknowledged: boolean;
  onAcknowledge: () => void;
  maxWarnings: number;
  confidenceScoring: boolean;
  showShortcuts: boolean;
  onShowShortcuts: (open: boolean) => void;
  confirmingSubmit: boolean;
  onConfirmingSubmit: (open: boolean) => void;
  answeredCount: number;
  totalQuestions: number;
  answers: Record<number, QuizAttemptAnswer>;
  questions: { id: number }[];
  onNavigate: (idx: number) => void;
  onConfirmSubmit: () => void;
  activeWarning: { kind: string; index: number } | null;
  warnings: number;
  autoClosed: boolean;
  onDismissWarning: () => void;
  finalizePending: boolean;
}) {
  const p = props;
  return (
    <>
      <RulesGateDialog
        open={!p.previewMode && !p.acknowledged}
        maxWarnings={p.maxWarnings}
        confidenceScoring={p.confidenceScoring}
        onAcknowledge={p.onAcknowledge}
      />
      <ShortcutsDialog open={p.showShortcuts} onOpenChange={p.onShowShortcuts} />
      <SubmitConfirmDialog
        open={p.confirmingSubmit}
        onOpenChange={p.onConfirmingSubmit}
        answeredCount={p.answeredCount}
        totalQuestions={p.totalQuestions}
        answers={p.answers}
        questions={p.questions}
        onNavigate={p.onNavigate}
        onConfirm={p.onConfirmSubmit}
      />
      <ViolationWarningDialog
        activeWarning={p.activeWarning && !p.autoClosed ? p.activeWarning : null}
        warnings={p.warnings}
        maxWarnings={p.maxWarnings}
        onDismiss={p.onDismissWarning}
      />
      <AutoClosedDialog
        open={p.autoClosed}
        maxWarnings={p.maxWarnings}
        loading={p.finalizePending}
        onViewSubmission={() => window.location.reload()}
      />
    </>
  );
}
