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
  maxPoints
}: DraftQuestionEditorProps) {
  return (
    <div className='border rounded-lg p-4 space-y-3 bg-muted/10'>
      <p className='text-sm font-medium'>
        {draft.id == null ? 'New question' : `Editing question #${draft.id}`}
      </p>

      <div className='grid grid-cols-2 gap-2'>
        <div className='space-y-1'>
          <Label className='text-xs'>Type</Label>
          <Select
            value={draft.question_type}
            onValueChange={(v) => setType(v as QuizQuestionType)}
            disabled={lockType}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='MCQ'>Multiple choice</SelectItem>
              <SelectItem value='TRUE_FALSE'>True / False</SelectItem>
              <SelectItem value='SHORT_ANSWER'>Short answer</SelectItem>
            </SelectContent>
          </Select>
          {lockType && (
            <p className='text-[11px] text-muted-foreground'>Locked to this section&apos;s type</p>
          )}
        </div>
        <div className='space-y-1'>
          <Label className='text-xs'>Points</Label>
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
          />
          {maxPoints != null && (
            <p className='text-[11px] text-muted-foreground'>
              Up to {Math.max(maxPoints, 1)} — this section&apos;s remaining marks budget
            </p>
          )}
        </div>
      </div>

      <div className='space-y-1'>
        <Label className='text-xs'>Question</Label>
        <Textarea
          rows={2}
          value={draft.question_text}
          onChange={(e) => setDraft({ ...draft, question_text: e.target.value })}
          placeholder='Type the question…'
        />
      </div>

      <div className='space-y-1'>
        <Label className='text-xs flex items-center gap-1'>
          Explanation
          <span className='text-muted-foreground font-normal'>
            (shown to students after submit)
          </span>
        </Label>
        <Textarea
          rows={2}
          value={draft.explanation}
          onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}
          placeholder='Optional — explain why the correct answer is correct, or link to the source material.'
        />
      </div>

      {draft.question_type === 'SHORT_ANSWER' ? (
        <p className='text-xs text-muted-foreground'>
          Students will type a free-form answer; you&apos;ll grade it manually.
        </p>
      ) : (
        <div className='space-y-2'>
          <Label className='text-xs'>Options (one correct)</Label>
          {draft.options.map((o, i) => (
            <div key={i} className='flex items-center gap-2'>
              <input
                type='radio'
                checked={o.is_correct}
                onChange={() => setCorrectExclusive(i)}
                aria-label={`Mark option ${i + 1} as correct`}
              />
              <Input
                value={o.option_text}
                onChange={(e) => updateOption(i, { option_text: e.target.value })}
                placeholder={`Option ${i + 1}`}
                disabled={draft.question_type === 'TRUE_FALSE'}
              />
              {draft.question_type === 'MCQ' && draft.options.length > 2 ? (
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7 text-muted-foreground'
                  onClick={() => removeOption(i)}
                  aria-label='Remove option'
                >
                  <XIcon className='w-3.5 h-3.5' />
                </Button>
              ) : null}
            </div>
          ))}
          {draft.question_type === 'MCQ' ? (
            <Button variant='outline' size='sm' className='gap-1' onClick={addOption}>
              <Plus className='w-3.5 h-3.5' /> Add option
            </Button>
          ) : null}
        </div>
      )}

      <div className='flex justify-end gap-2'>
        <Button variant='outline' onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save question'}
        </Button>
      </div>
    </div>
  );
}
