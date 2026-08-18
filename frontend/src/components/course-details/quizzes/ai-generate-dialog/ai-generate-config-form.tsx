'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { QuizQuestionType } from '@/lib/course-details/services/quizzes-types';
import { AiGenerateOptions } from './ai-generate-options';
import { AiHowItWorks } from './ai-how-it-works';
import { AiSourceField } from './ai-source-field';
import type { Difficulty } from './types';

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
  difficulty: Difficulty;
  setDifficulty: (v: Difficulty) => void;
  questionTypes: QuizQuestionType[];
  toggleType: (t: QuizQuestionType) => void;
  isGenerating: boolean;
}

export function AiGenerateConfigForm(props: AiGenerateConfigFormProps) {
  const { isNewQuiz, isGenerating } = props;

  return (
    <div className='flex-1 overflow-y-auto pr-1 -mr-1 space-y-3.5'>
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
        <Label htmlFor='ai-prompt'>What should the questions cover? *</Label>
        <Textarea
          id='ai-prompt'
          rows={3}
          placeholder='e.g. "10 questions on photosynthesis covering light-dependent and light-independent reactions, mix of conceptual and application questions"'
          value={props.prompt}
          onChange={(e) => props.setPrompt(e.target.value)}
          disabled={isGenerating}
        />
      </div>
      <AiGenerateOptions
        count={props.count}
        setCount={props.setCount}
        difficulty={props.difficulty}
        setDifficulty={props.setDifficulty}
        questionTypes={props.questionTypes}
        toggleType={props.toggleType}
        disabled={isGenerating}
      />
      <AiSourceField
        sourceMaterial={props.sourceMaterial}
        setSourceMaterial={props.setSourceMaterial}
        sourceFileName={props.sourceFileName}
        setSourceFileName={props.setSourceFileName}
        isExtractingSource={props.isExtractingSource}
        onSourceFile={props.onSourceFile}
        disabled={isGenerating}
      />
      <AiHowItWorks isNewQuiz={isNewQuiz} />
    </div>
  );
}
