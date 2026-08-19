'use client';

import { Sparkles, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AiGenerateConfigForm } from '../ai-generate-dialog/ai-generate-config-form';
import { AiGenerateFooter } from '../ai-generate-dialog/ai-generate-footer';
import { AiGeneratePreview } from '../ai-generate-dialog/ai-generate-preview';
import { useAiGenerateDialog } from '../ai-generate-dialog/use-ai-generate-dialog';
import type { DraftQuestion, QuizQuestionType } from '../quiz-builder/types';
import { AI_SOURCE_MIN_CHARS } from '../../_shared/extract-source-text';

/// Same "Generate with AI" flow as the dialog version, just rendered as a
/// normal section in the page instead of a popup — a modal stacked on top
/// of the already-full-screen "Add new quiz" overlay was modal-on-modal.
export function InlineAiGenerate({
  courseOfferingId,
  onAdd,
  onClose,
  lockedQuestionTypes
}: {
  courseOfferingId: string;
  onAdd: (questions: DraftQuestion[]) => void;
  onClose: () => void;
  lockedQuestionTypes?: QuizQuestionType[];
}) {
  const d = useAiGenerateDialog({
    courseOfferingId,
    destination: { kind: 'local' },
    onOpenChange: (open) => {
      if (!open) onClose();
    },
    onLocalAdd: onAdd,
    lockedQuestionTypes
  });

  return (
    <div className='border border-primary/20 rounded-lg p-4 space-y-3 bg-primary/[0.03]'>
      <div className='flex items-center justify-between gap-2'>
        <p className='text-sm font-medium flex items-center gap-2'>
          <span className='grid place-items-center w-6 h-6 rounded-full bg-primary/10'>
            <Sparkles className='w-3.5 h-3.5 text-primary' />
          </span>
          Generate with AI
          {d.phase === 'preview' ? (
            <Badge variant='secondary' className='tabular-nums'>
              {d.keepSet.size} / {d.generated.length} keeping
            </Badge>
          ) : null}
        </p>
        <Button variant='ghost' size='icon' className='h-7 w-7' onClick={onClose} aria-label='Close'>
          <X className='w-4 h-4' />
        </Button>
      </div>
      <p className='text-xs text-muted-foreground -mt-1'>
        {d.phase === 'config'
          ? 'Describe what to cover and the AI will draft questions for you to review.'
          : "Uncheck anything you don't want, then add the rest."}
      </p>

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
        promptReady={!!d.prompt.trim()}
        sourceReady={d.sourceMaterial.trim().length >= AI_SOURCE_MIN_CHARS}
        titleReady
        keepCount={d.keepSet.size}
        count={d.count}
        onCancel={onClose}
        onGenerate={d.handleGenerate}
        onSave={d.handleSave}
      />
    </div>
  );
}
