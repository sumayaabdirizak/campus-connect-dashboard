'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { QuizQuestionType } from '@/lib/course-details/services/quizzes-types';
import {
  quizFormFieldClass,
  quizFormHintClass,
  quizFormLabelClass,
  quizFormRowClass
} from '../new-quiz-page/field-styles';
import { AI_SECTION_TYPE_LABEL, type AiSectionPlanItem } from './section-plan';

interface AiSectionCountsProps {
  sections: AiSectionPlanItem[];
  counts: Partial<Record<QuizQuestionType, number>>;
  setCount: (type: QuizQuestionType, count: number) => void;
  disabled?: boolean;
}

export function AiSectionCounts({
  sections,
  counts,
  setCount,
  disabled
}: AiSectionCountsProps) {
  return (
    <div className='space-y-3'>
      <div>
        <Label className={quizFormLabelClass}>Questions per section</Label>
        <p className={`mt-1 ${quizFormHintClass}`}>
          Sections come from Marking. Choose how many questions — planned marks
          are split across them (e.g. 5 marks ÷ 10 questions = 0.5 each).
        </p>
      </div>
      <div className='space-y-2'>
        {sections.map((s) => {
          const full = remainingIsFull(s);
          const count = full ? 0 : (counts[s.type] ?? 0);
          const each =
            !full && count > 0 && s.remainingMarks > 0
              ? s.remainingMarks / count
              : null;
          return (
            <div
              key={s.type}
              className={`flex flex-wrap items-center justify-between gap-3 ${quizFormRowClass}`}
            >
              <div className='min-w-0'>
                <p className='text-sm font-medium text-foreground'>
                  {AI_SECTION_TYPE_LABEL[s.type]}
                </p>
                <p className={quizFormHintClass}>
                  {s.marks} marks planned
                  {s.remainingMarks < s.marks
                    ? ` · ${s.remainingMarks} left`
                    : ''}
                  {full ? ' · section full' : ''}
                  {each != null
                    ? ` · ≈ ${Number.isInteger(each) ? each : each.toFixed(2)} marks each`
                    : ''}
                </p>
              </div>
              <div className='flex items-center gap-2'>
                <Label htmlFor={`ai-count-${s.type}`} className='sr-only'>
                  Count for {AI_SECTION_TYPE_LABEL[s.type]}
                </Label>
                <Input
                  id={`ai-count-${s.type}`}
                  type='number'
                  min={0}
                  max={25}
                  disabled={disabled || full}
                  value={count}
                  onChange={(e) =>
                    setCount(
                      s.type,
                      Math.min(25, Math.max(0, Number(e.target.value) || 0))
                    )
                  }
                  className={`${quizFormFieldClass} w-20`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function remainingIsFull(s: AiSectionPlanItem) {
  return s.remainingMarks <= 0;
}
