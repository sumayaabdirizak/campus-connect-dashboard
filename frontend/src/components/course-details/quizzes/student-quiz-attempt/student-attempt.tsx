'use client';

import type { StudentAttemptProps } from './types';
import { useStudentAttemptController } from './use-student-attempt-controller';
import {
  AttemptHeader,
  MultiTabBanner,
  PreviewBanner,
  ProctoringBanner,
  ProgressBlock
} from './attempt-chrome';
import { AttemptDialogs } from './attempt-dialogs';
import { AttemptNav } from './attempt-nav';
import { QuestionCard } from './question-card';

export function StudentAttempt({
  data,
  onSubmitted,
  previewMode = false,
  onClosePreview
}: StudentAttemptProps) {
  const c = useStudentAttemptController(data, previewMode, onSubmitted);

  return (
    <div className='mx-auto max-w-2xl space-y-6'>
      {previewMode ? <PreviewBanner /> : null}
      <AttemptHeader
        title={data.quiz.title}
        totalPoints={data.totalPoints}
        questionCount={data.questions.length}
        remaining={c.remaining}
      />
      {!previewMode ? (
        <ProctoringBanner
          warnings={c.violations.warnings}
          maxWarnings={c.violations.maxWarnings}
        />
      ) : null}
      {c.multiTabConflict ? <MultiTabBanner /> : null}
      <ProgressBlock
        currentIdx={c.currentIdx}
        questionCount={data.questions.length}
        progressPct={c.progressPct}
        saveOpts={{
          isOffline: c.autosave.isOffline,
          queuedCount: c.autosave.queuedCount,
          savePending: c.autosave.savePending,
          saveErrored: c.autosave.saveErrored,
          lastSavedAt: c.autosave.lastSavedAt
        }}
      />
      {c.currentQuestion ? (
        <QuestionCard
          question={c.currentQuestion}
          answer={c.autosave.answers[c.currentQuestion.id]}
          watermarkLabel={c.watermarkLabel}
          previewMode={previewMode}
          confidenceScoring={c.confidenceScoring}
          onUpdate={c.autosave.updateAnswer}
        />
      ) : null}
      <AttemptNav
        isFirst={c.currentIdx === 0}
        isLast={c.currentIdx === data.questions.length - 1}
        previewMode={previewMode}
        warnings={c.violations.warnings}
        maxWarnings={c.violations.maxWarnings}
        submitPending={c.submitPending}
        isOffline={c.autosave.isOffline}
        queuedCount={c.autosave.queuedCount}
        onPrev={() => c.navigateTo(c.currentIdx - 1)}
        onNext={() => c.navigateTo(c.currentIdx + 1)}
        onSubmitClick={() => c.setConfirmingSubmit(true)}
        onClosePreview={onClosePreview}
      />
      <AttemptDialogs
        previewMode={previewMode}
        acknowledged={c.acknowledged}
        onAcknowledge={() => c.setAcknowledged(true)}
        maxWarnings={c.violations.maxWarnings}
        confidenceScoring={c.confidenceScoring}
        showShortcuts={c.showShortcuts}
        onShowShortcuts={c.setShowShortcuts}
        confirmingSubmit={c.confirmingSubmit}
        onConfirmingSubmit={c.setConfirmingSubmit}
        answeredCount={c.answeredCount}
        totalQuestions={data.questions.length}
        answers={c.autosave.answers}
        questions={data.questions}
        currentIdx={c.currentIdx}
        onNavigate={c.navigateTo}
        onConfirmSubmit={() => {
          c.setConfirmingSubmit(false);
          c.handleSubmit(false);
        }}
        activeWarning={c.violations.activeWarning}
        warnings={c.violations.warnings}
        autoClosed={c.violations.autoClosed}
        onDismissWarning={() => c.violations.setActiveWarning(null)}
        finalizePending={c.violations.finalizePending}
      />
    </div>
  );
}
