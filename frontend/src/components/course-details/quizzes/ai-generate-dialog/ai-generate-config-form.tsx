'use client';

import { MessageSquareText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { QuizQuestionType } from '@/lib/course-details/services/quizzes-types';
import { AiGenerateOptions } from './ai-generate-options';
import { AiHowItWorks } from './ai-how-it-works';
import { AiSourceField } from './ai-source-field';

interface AiGenerateConfigFormProps {
  isNewQuiz: boolean;
  quizTitle: string;
  setQuizTitle: (v: string) => void;
  prompt: string;
  setPrompt: (v: string) => void;
  sourceMaterial: string;
  setSourceMaterial: (v: string) => void;
  sourceFileName: string | null;
  setSourceFileName: (v: string | null) => void;
  isExtractingSource: boolean;
  onSourceFile: (file: File | undefined) => void;
  count: number;
  setCount: (v: number) => void;
  questionTypes: QuizQuestionType[];
  toggleType: (t: QuizQuestionType) => void;
  isGenerating: boolean;
  lockedTypes?: QuizQuestionType[];
}

export function AiGenerateConfigForm(props: AiGenerateConfigFormProps) {
  const { isNewQuiz, isGenerating } = props;

  return (
    <div className='flex-1 overflow-y-auto pr-1 -mr-1 space-y-4'>
      {isNewQuiz ? (
        <div className='space-y-1.5'>
          <Label htmlFor='ai-quiz-title'>Quiz title *</Label>
          <Input
            id='ai-quiz-title'
            placeholder='e.g. "Chapter 3 — Photosynthesis"'
            value={props.quizTitle}
            onChange={(e) => props.setQuizTitle(e.target.value)}
            disabled={isGenerating}
          />
        </div>
      ) : null}
      <div className='space-y-1.5'>
        <Label htmlFor='ai-prompt' className='flex items-center gap-1.5'>
          <MessageSquareText className='w-3.5 h-3.5 text-primary' />
          What should the questions cover? *
        </Label>
        <Textarea
          id='ai-prompt'
          rows={3}
          placeholder='e.g. "Photosynthesis — light-dependent and light-independent reactions"'
          value={props.prompt}
          onChange={(e) => props.setPrompt(e.target.value)}
          disabled={isGenerating}
          className='focus-visible:ring-primary/40'
        />
      </div>
      <div className='border-t border-primary/10 pt-4'>
        <AiGenerateOptions
          count={props.count}
          setCount={props.setCount}
          questionTypes={props.questionTypes}
          toggleType={props.toggleType}
          disabled={isGenerating}
          lockedTypes={props.lockedTypes}
        />
      </div>
      <div className='border-t border-primary/10 pt-4'>
        <AiSourceField
          sourceMaterial={props.sourceMaterial}
          setSourceMaterial={props.setSourceMaterial}
          sourceFileName={props.sourceFileName}
          setSourceFileName={props.setSourceFileName}
          isExtractingSource={props.isExtractingSource}
          onSourceFile={props.onSourceFile}
          disabled={isGenerating}
        />
      </div>
      <AiHowItWorks isNewQuiz={isNewQuiz} />
    </div>
  );
}
