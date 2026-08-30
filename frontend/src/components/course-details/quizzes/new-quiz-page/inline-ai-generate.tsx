'use client';

import { Sparkles, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AiGenerateConfigForm } from '../ai-generate-dialog/ai-generate-config-form';
import { AiGenerateFooter } from '../ai-generate-dialog/ai-generate-footer';
import { AiGeneratePreview } from '../ai-generate-dialog/ai-generate-preview';
import type { AiSectionPlanItem } from '../ai-generate-dialog/section-plan';
import { useAiGenerateDialog } from '../ai-generate-dialog/use-ai-generate-dialog';
import type { QuizDeliveryMode } from '../quiz-question-types';
import type { DraftQuestion, QuizQuestionType } from '../quiz-builder/types';
import { AI_SOURCE_MIN_CHARS } from '../../_shared/extract-source-text';
import { quizFormCardClass } from './field-styles';

/// Same "Create with AI" flow as the dialog, inlined on the create-quiz page.
export function InlineAiGenerate({
  courseOfferingId,
  onAdd,
  onClose,
  lockedQuestionTypes,
  sectionPlan,
  quizMode = 'online'
}: {
  courseOfferingId: string;
  onAdd: (questions: DraftQuestion[]) => void;
  onClose: () => void;
  lockedQuestionTypes?: QuizQuestionType[];
  sectionPlan?: AiSectionPlanItem[];
  quizMode?: QuizDeliveryMode;
}) {
  const sectioned = (sectionPlan?.length ?? 0) > 0;
  const d = useAiGenerateDialog({
    courseOfferingId,
    destination: { kind: 'local' },
    onOpenChange: (open) => {
      if (!open) onClose();
    },
    onLocalAdd: onAdd,
    lockedQuestionTypes,
    sectionPlan,
    quizMode
  });

  const promptReady = sectioned ? true : !!d.prompt.trim();
  const generateCount = sectioned ? d.totalSectionCount : d.count;

  return (
    <div className={`${quizFormCardClass} space-y-5`}>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0 space-y-1'>
          <p className='flex items-center gap-2 text-base font-semibold text-foreground'>
            <span className='grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground'>
              <Sparkles className='size-4' />
            </span>
            Create with AI
            {d.phase === 'preview' ? (
              <Badge variant='secondary' className='rounded-lg tabular-nums'>
                {d.keepSet.size} / {d.generated.length} keeping
              </Badge>
            ) : null}
          </p>
          <p className='text-sm text-muted-foreground'>
            {d.phase === 'config'
              ? sectioned
                ? 'Upload notes, set how many questions each Marking section needs, then generate.'
                : 'Upload notes, say what to cover, then generate.'
              : 'Uncheck anything you don’t want, then add the rest.'}
          </p>
        </div>
        <Button
          variant='ghost'
          size='icon'
          className='size-9 shrink-0 rounded-xl text-muted-foreground hover:bg-secondary hover:text-primary'
          onClick={onClose}
          aria-label='Close'
        >
          <X className='size-4' />
        </Button>
      </div>

      {d.phase === 'config' ? (
        <AiGenerateConfigForm
          isNewQuiz={false}
          quizTitle={d.quizTitle}
          setQuizTitle={d.setQuizTitle}
          prompt={d.prompt}
          setPrompt={d.setPrompt}
          sourceMaterial={d.sourceMaterial}
          setSourceMaterial={d.setSourceMaterial}
          sourceFileName={d.sourceFileName}
          setSourceFileName={d.setSourceFileName}
          isExtractingSource={d.isExtractingSource}
          onSourceFile={d.handleSourceFile}
          count={d.count}
          setCount={d.setCount}
          questionTypes={d.questionTypes}
          toggleType={d.toggleType}
          isGenerating={d.isGenerating}
          lockedTypes={d.lockedQuestionTypes}
          sectionPlan={d.sectionPlan}
          sectionCounts={d.sectionCounts}
          setSectionCount={d.setSectionCount}
          minimal
          quizMode={d.quizMode}
        />
      ) : (
        <AiGeneratePreview
          generated={d.generated}
          keepSet={d.keepSet}
          onToggleKeep={d.toggleKeep}
          onToggleAll={d.toggleAll}
          onBack={() => d.setPhase('config')}
          isSaving={d.isSaving}
        />
      )}

      <AiGenerateFooter
        phase={d.phase}
        isNewQuiz={false}
        isGenerating={d.isGenerating}
        isExtractingSource={d.isExtractingSource}
        isSaving={d.isSaving}
        promptReady={promptReady}
        sourceReady={d.sourceMaterial.trim().length >= AI_SOURCE_MIN_CHARS}
        titleReady
        keepCount={d.keepSet.size}
        count={generateCount}
        onCancel={onClose}
        onGenerate={d.handleGenerate}
        onSave={d.handleSave}
        minimal
        generateDisabled={sectioned && generateCount === 0}
      />
    </div>
  );
}
