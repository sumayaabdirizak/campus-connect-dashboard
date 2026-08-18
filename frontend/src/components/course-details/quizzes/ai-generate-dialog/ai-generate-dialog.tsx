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
  onQuizCreated
}: AiGenerateDialogProps) {
  const d = useAiGenerateDialog({
    courseOfferingId,
    destination,
    onOpenChange,
    onQuizCreated
  });

  return (
    <Dialog open={open} onOpenChange={d.closeHandler}>
      <DialogContent className='max-w-3xl max-h-[90vh] overflow-hidden flex flex-col'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Sparkles className='w-5 h-5 text-primary' />
            Generate with AI
            {d.phase === 'preview' ? (
              <Badge variant='secondary' className='tabular-nums'>
                {d.keepSet.size} / {d.generated.length} keeping
              </Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            {d.phase === 'config'
              ? 'Describe what you want and the AI will draft questions for you to review.'
              : d.isNewQuiz
                ? "Review and uncheck anything you don't want — the rest become a new draft quiz."
                : "Review and uncheck anything you don't want before adding the rest to the quiz."}
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
            difficulty={d.difficulty}
            setDifficulty={d.setDifficulty}
            questionTypes={d.questionTypes}
            toggleType={d.toggleType}
            isGenerating={d.isGenerating}
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
