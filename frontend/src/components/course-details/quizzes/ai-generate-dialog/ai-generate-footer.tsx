'use client';

import { Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import {
  quizFormOutlineBtnClass,
  quizFormPrimaryBtnClass
} from '../new-quiz-page/field-styles';

interface AiGenerateFooterProps {
  phase: 'config' | 'preview';
  isNewQuiz: boolean;
  isGenerating: boolean;
  isExtractingSource: boolean;
  isSaving: boolean;
  promptReady: boolean;
  sourceReady: boolean;
  titleReady: boolean;
  keepCount: number;
  count: number;
  onCancel: () => void;
  onGenerate: () => void;
  onSave: () => void;
  minimal?: boolean;
  generateDisabled?: boolean;
}

export function AiGenerateFooter({
  phase,
  isNewQuiz,
  isGenerating,
  isExtractingSource,
  isSaving,
  promptReady,
  sourceReady,
  titleReady,
  keepCount,
  count,
  onCancel,
  onGenerate,
  onSave,
  minimal,
  generateDisabled
}: AiGenerateFooterProps) {
  const actions = (
    <>
      <Button variant='outline' onClick={onCancel} className={quizFormOutlineBtnClass}>
        Cancel
      </Button>
      {phase === 'config' ? (
        <Button
          onClick={onGenerate}
          disabled={
            isGenerating ||
            isExtractingSource ||
            !promptReady ||
            !sourceReady ||
            generateDisabled ||
            (isNewQuiz && !titleReady)
          }
          className={`${quizFormPrimaryBtnClass} gap-1.5`}
        >
          {isGenerating ? (
            <>
              <Loader2 className='size-4 animate-spin' />
              Drafting {count}…
            </>
          ) : (
            <>
              <Wand2 className='size-4' />
              Generate questions
            </>
          )}
        </Button>
      ) : (
        <Button
          onClick={onSave}
          disabled={isSaving || keepCount === 0}
          className={`${quizFormPrimaryBtnClass} gap-1.5`}
        >
          {isSaving
            ? isNewQuiz
              ? 'Creating quiz…'
              : 'Saving…'
            : isNewQuiz
              ? `Create quiz with ${keepCount}`
              : `Add ${keepCount} to quiz`}
        </Button>
      )}
    </>
  );

  if (minimal) {
    return <div className='flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4'>{actions}</div>;
  }

  return <DialogFooter>{actions}</DialogFooter>;
}
