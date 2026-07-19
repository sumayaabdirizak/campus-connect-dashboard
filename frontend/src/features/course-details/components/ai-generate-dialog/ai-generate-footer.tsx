'use client';

import { Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';

interface AiGenerateFooterProps {
  phase: 'config' | 'preview';
  isNewQuiz: boolean;
  isGenerating: boolean;
  isExtractingSource: boolean;
  isSaving: boolean;
  promptReady: boolean;
  titleReady: boolean;
  keepCount: number;
  count: number;
  onCancel: () => void;
  onGenerate: () => void;
  onSave: () => void;
}

export function AiGenerateFooter({
  phase,
  isNewQuiz,
  isGenerating,
  isExtractingSource,
  isSaving,
  promptReady,
  titleReady,
  keepCount,
  count,
  onCancel,
  onGenerate,
  onSave
}: AiGenerateFooterProps) {
  return (
    <DialogFooter>
      <Button variant='outline' onClick={onCancel}>
        Cancel
      </Button>
      {phase === 'config' ? (
        <Button
          onClick={onGenerate}
          disabled={
            isGenerating || isExtractingSource || !promptReady || (isNewQuiz && !titleReady)
          }
          className='gap-1'
        >
          {isGenerating ? (
            <>
              <Loader2 className='w-4 h-4 animate-spin' />
              Drafting {count}…
            </>
          ) : (
            <>
              <Wand2 className='w-4 h-4' />
              Generate
            </>
          )}
        </Button>
      ) : (
        <Button onClick={onSave} disabled={isSaving || keepCount === 0} className='gap-1'>
          {isSaving
            ? isNewQuiz
              ? 'Creating quiz…'
              : 'Saving…'
            : isNewQuiz
              ? `Create quiz with ${keepCount}`
              : `Save ${keepCount} to bank`}
        </Button>
      )}
    </DialogFooter>
  );
}
