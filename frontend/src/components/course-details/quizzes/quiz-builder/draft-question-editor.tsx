'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Plus, X as XIcon } from 'lucide-react';
import type { OptionInput, QuizQuestionType } from '@/lib/course-details/services/quizzes-types';
import { cn } from '@/lib/utils';
import {
  quizFormFieldClass,
  quizFormHintClass,
  quizFormLabelClass,
  quizFormOutlineBtnClass,
  quizFormPrimaryBtnClass,
  quizFormSelectClass,
  quizFormTextareaClass
} from '../new-quiz-page/field-styles';
import { QUESTION_TYPE_LABELS, questionTypesForMode } from '../quiz-question-types';
import type { QuizDeliveryMode } from '../quiz-question-types';
import type { DraftQuestion } from './types';

interface DraftQuestionEditorProps {
  draft: DraftQuestion;
  setDraft: (draft: DraftQuestion) => void;
  setType: (type: QuizQuestionType) => void;
  updateOption: (i: number, patch: Partial<OptionInput>) => void;
  addOption: () => void;
  removeOption: (i: number) => void;
  setCorrectExclusive: (i: number) => void;
  onCancel: () => void;
  onSave: () => void;
  isSaving: boolean;
  /// When set, this question was added from a specific marks-plan section —
  /// keep it pinned to that type so it doesn't drift out of the section it
  /// was added under.
  lockType?: boolean;
  /// When set, caps the Points input at the section's remaining marks
  /// budget (target minus what's already used by the section's other
  /// questions), so a save can't push the section over its planned total.
  maxPoints?: number;
  /** Defaults to all types for offline quizzes. Online quizzes omit short answer. */
  quizMode?: QuizDeliveryMode;
}

export function DraftQuestionEditor({
  draft,
  setDraft,
  setType,
  updateOption,
  addOption,
  removeOption,
  setCorrectExclusive,
  onCancel,
  onSave,
  isSaving,
  lockType,
  maxPoints,
  quizMode = 'online'
}: DraftQuestionEditorProps) {
  const allowedTypes = questionTypesForMode(quizMode);

  return (
    <div className='space-y-4 rounded-xl border-2 border-primary/25 bg-card p-4 sm:p-5'>
      <p className='text-base font-semibold tracking-tight text-foreground'>
        {draft.id == null ? 'New question' : `Editing question #${draft.id}`}
      </p>

      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
        <div className='space-y-1.5'>
          <Label className={quizFormLabelClass}>Type</Label>
          <Select
            value={draft.question_type}
            onValueChange={(v) => setType(v as QuizQuestionType)}
            disabled={lockType}
          >
            <SelectTrigger
              className={cn(
                quizFormSelectClass,
                'disabled:bg-muted disabled:font-medium disabled:text-foreground disabled:opacity-100'
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowedTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {QUESTION_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {lockType ? (
            <p className='text-xs font-medium text-muted-foreground'>
              Locked to this section&apos;s type
            </p>
          ) : null}
        </div>
        <div className='space-y-1.5'>
          <Label className={quizFormLabelClass}>Points</Label>
          <Input
            type='number'
            min={1}
            max={maxPoints}
            value={draft.points}
            onChange={(e) => {
              let next = Math.max(1, Number(e.target.value) || 1);
              if (maxPoints != null) next = Math.min(next, Math.max(maxPoints, 1));
              setDraft({ ...draft, points: next });
            }}
            className={cn(quizFormFieldClass, 'font-semibold tabular-nums')}
          />
          {maxPoints != null ? (
            <p className='text-xs font-medium text-muted-foreground'>
              Up to {Math.max(maxPoints, 1)} — this section&apos;s remaining marks budget
            </p>
          ) : null}
        </div>
      </div>

      <div className='space-y-1.5'>
        <Label className={quizFormLabelClass}>Question</Label>
        <Textarea
          rows={3}
          value={draft.question_text}
          onChange={(e) => setDraft({ ...draft, question_text: e.target.value })}
          placeholder='Type the question…'
          className={cn(
            quizFormTextareaClass,
            'placeholder:text-muted-foreground focus-visible:border-primary'
          )}
        />
      </div>

      <div className='space-y-1.5'>
        <Label className={cn(quizFormLabelClass, 'flex flex-wrap items-center gap-1')}>
          Explanation
          <span className='font-normal text-muted-foreground'>
            (shown to students after submit)
          </span>
        </Label>
        <Textarea
          rows={2}
          value={draft.explanation}
          onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}
          placeholder='Optional — explain why the correct answer is correct, or link to the source material.'
          className={cn(quizFormTextareaClass, 'placeholder:text-muted-foreground')}
        />
      </div>

      {draft.question_type === 'SHORT_ANSWER' ? (
        <p className={quizFormHintClass}>
          Students will type a free-form answer; you&apos;ll grade it manually.
        </p>
      ) : (
        <div className='space-y-2.5'>
          <Label className={quizFormLabelClass}>Options (one correct)</Label>
          {draft.options.map((o, i) => (
            <div
              key={i}
              className='flex items-center gap-2.5 rounded-full border border-border bg-muted px-3 py-1.5'
            >
              <input
                type='radio'
                name={`draft-correct-${draft.id ?? 'new'}`}
                checked={o.is_correct}
                onChange={() => setCorrectExclusive(i)}
                aria-label={`Mark option ${i + 1} as correct`}
                className='size-4 shrink-0 accent-primary'
              />
              <Input
                value={o.option_text}
                onChange={(e) => updateOption(i, { option_text: e.target.value })}
                placeholder={`Option ${i + 1}`}
                disabled={draft.question_type === 'TRUE_FALSE'}
                className='h-9 border-0 bg-transparent px-1 text-sm text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-0 disabled:opacity-80'
              />
              {draft.question_type === 'MCQ' && draft.options.length > 2 ? (
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-8 shrink-0 text-muted-foreground hover:text-destructive'
                  onClick={() => removeOption(i)}
                  aria-label='Remove option'
                >
                  <XIcon className='size-4' />
                </Button>
              ) : null}
            </div>
          ))}
          {draft.question_type === 'MCQ' ? (
            <Button
              variant='outline'
              size='sm'
              className={`${quizFormOutlineBtnClass} h-9 gap-1.5`}
              onClick={addOption}
            >
              <Plus className='size-3.5' /> Add option
            </Button>
          ) : null}
        </div>
      )}

      <div className='flex justify-end gap-2 border-t border-border pt-3'>
        <Button variant='outline' className={quizFormOutlineBtnClass} onClick={onCancel}>
          Cancel
        </Button>
        <Button className={quizFormPrimaryBtnClass} onClick={onSave} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save question'}
        </Button>
      </div>
    </div>
  );
}
