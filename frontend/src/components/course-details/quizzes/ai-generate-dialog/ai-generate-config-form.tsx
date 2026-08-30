'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { QuizQuestionType } from '@/lib/course-details/services/quizzes-types';
import {
  quizFormFieldClass,
  quizFormHintClass,
  quizFormLabelClass,
  quizFormTextareaClass
} from '../new-quiz-page/field-styles';
import { AiGenerateOptions } from './ai-generate-options';
import { AiHowItWorks } from './ai-how-it-works';
import { AiSectionCounts } from './ai-section-counts';
import { AiSourceField } from './ai-source-field';
import type { AiSectionPlanItem } from './section-plan';

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
  sectionPlan?: AiSectionPlanItem[];
  sectionCounts?: Partial<Record<QuizQuestionType, number>>;
  setSectionCount?: (type: QuizQuestionType, count: number) => void;
  /** Cleaner layout for the create-quiz inline panel. */
  minimal?: boolean;
  quizMode?: import('../quiz-question-types').QuizDeliveryMode;
}

export function AiGenerateConfigForm(props: AiGenerateConfigFormProps) {
  const { isNewQuiz, isGenerating, minimal, sectionPlan } = props;
  const sectioned = (sectionPlan?.length ?? 0) > 0;

  return (
    <div className={`space-y-4 ${minimal ? '' : 'flex-1 overflow-y-auto pr-1 -mr-1'}`}>
      <AiSourceField
        sourceMaterial={props.sourceMaterial}
        setSourceMaterial={props.setSourceMaterial}
        sourceFileName={props.sourceFileName}
        setSourceFileName={props.setSourceFileName}
        isExtractingSource={props.isExtractingSource}
        onSourceFile={props.onSourceFile}
        disabled={isGenerating}
      />

      {isNewQuiz ? (
        <div className='space-y-1.5'>
          <Label htmlFor='ai-quiz-title' className={quizFormLabelClass}>
            Quiz title *
          </Label>
          <Input
            id='ai-quiz-title'
            placeholder='e.g. Chapter 3 — Photosynthesis'
            value={props.quizTitle}
            onChange={(e) => props.setQuizTitle(e.target.value)}
            disabled={isGenerating}
            className={quizFormFieldClass}
          />
        </div>
      ) : null}

      {sectioned ? (
        <>
          {props.sectionPlan && props.sectionCounts && props.setSectionCount ? (
            <AiSectionCounts
              sections={props.sectionPlan}
              counts={props.sectionCounts}
              setCount={props.setSectionCount}
              disabled={isGenerating}
            />
          ) : null}
          <div className='space-y-1.5'>
            <Label htmlFor='ai-prompt' className={quizFormLabelClass}>
              Topic focus (optional)
            </Label>
            <Textarea
              id='ai-prompt'
              rows={2}
              placeholder='Optional — e.g. focus on chapter 3 photosynthesis'
              value={props.prompt}
              onChange={(e) => props.setPrompt(e.target.value)}
              disabled={isGenerating}
              className={quizFormTextareaClass}
            />
            <p className={quizFormHintClass}>
              Leave blank to generate from the uploaded file only.
            </p>
          </div>
        </>
      ) : (
        <>
          <div className='space-y-1.5'>
            <Label htmlFor='ai-prompt' className={quizFormLabelClass}>
              What should the questions cover? *
            </Label>
            <Textarea
              id='ai-prompt'
              rows={minimal ? 2 : 3}
              placeholder='e.g. Photosynthesis — light and dark reactions'
              value={props.prompt}
              onChange={(e) => props.setPrompt(e.target.value)}
              disabled={isGenerating}
              className={quizFormTextareaClass}
            />
            {minimal ? (
              <p className={quizFormHintClass}>Keep it short — a topic or chapter is enough.</p>
            ) : null}
          </div>

          <AiGenerateOptions
            count={props.count}
            setCount={props.setCount}
            questionTypes={props.questionTypes}
            toggleType={props.toggleType}
            disabled={isGenerating}
            lockedTypes={props.lockedTypes}
            minimal={minimal}
            quizMode={props.quizMode}
          />
        </>
      )}

      {minimal ? null : <AiHowItWorks isNewQuiz={isNewQuiz} />}
    </div>
  );
}
