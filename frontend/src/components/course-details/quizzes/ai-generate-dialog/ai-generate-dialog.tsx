'use client';

import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { AI_SOURCE_MIN_CHARS } from '../../_shared/extract-source-text';
import { AiGenerateConfigForm } from './ai-generate-config-form';
import { AiGenerateFooter } from './ai-generate-footer';
import { AiGeneratePreview } from './ai-generate-preview';
import type { AiGenerateDialogProps } from './types';
import { useAiGenerateDialog } from './use-ai-generate-dialog';

export function AiGenerateDialog({
  open,
  onOpenChange,
  courseOfferingId,
  destination,
  onQuizCreated,
  onLocalAdd,
  lockedQuestionTypes
}: AiGenerateDialogProps) {
  const d = useAiGenerateDialog({
    courseOfferingId,
    destination,
    onOpenChange,
    onQuizCreated,
    onLocalAdd,
    lockedQuestionTypes
  });

  return (
    <Dialog open={open} onOpenChange={d.closeHandler}>
      <DialogContent className='max-w-3xl max-h-[90vh] overflow-hidden flex flex-col'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <span className='grid place-items-center w-8 h-8 rounded-full bg-primary/10'>
              <Sparkles className='w-4 h-4 text-primary' />
            </span>
            Generate with AI
            {d.phase === 'preview' ? (
              <Badge variant='secondary' className='tabular-nums'>
                {d.keepSet.size} / {d.generated.length} keeping
              </Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            {d.phase === 'config'
              ? 'Describe what to cover and the AI will draft questions for you to review.'
              : d.isNewQuiz
                ? "Uncheck anything you don't want — the rest become a new draft quiz."
                : "Uncheck anything you don't want, then add the rest to the quiz."}
          </DialogDescription>
        </DialogHeader>
        {d.phase === 'config' ? (
          <AiGenerateConfigForm
            isNewQuiz={d.isNewQuiz}
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
          isNewQuiz={d.isNewQuiz}
          isGenerating={d.isGenerating}
          isExtractingSource={d.isExtractingSource}
          isSaving={d.isSaving}
          promptReady={!!d.prompt.trim()}
          sourceReady={d.sourceMaterial.trim().length >= AI_SOURCE_MIN_CHARS}
          titleReady={!!d.quizTitle.trim()}
          keepCount={d.keepSet.size}
          count={d.count}
          onCancel={() => d.closeHandler(false)}
          onGenerate={d.handleGenerate}
          onSave={d.handleSave}
        />
      </DialogContent>
    </Dialog>
  );
}
