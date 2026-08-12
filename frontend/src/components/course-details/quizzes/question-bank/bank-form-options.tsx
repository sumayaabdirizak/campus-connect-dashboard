'use client';

import { CheckCircle2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FormDraft } from './form-draft';

interface BankFormOptionsProps {
  draft: FormDraft;
  updateOption: (
    idx: number,
    patch: Partial<{ option_text: string; is_correct: boolean }>
  ) => void;
  addOption: () => void;
  removeOption: (idx: number) => void;
  markSingleCorrect: (idx: number) => void;
}

export function BankFormOptions({
  draft,
  updateOption,
  addOption,
  removeOption,
  markSingleCorrect
}: BankFormOptionsProps) {
  return (
    <div className='space-y-1.5'>
      <div className='flex items-center justify-between'>
        <Label>Options</Label>
        {draft.question_type === 'MCQ' && draft.options.length < 6 ? (
          <Button variant='ghost' size='sm' className='gap-1' onClick={addOption}>
            <Plus className='w-3 h-3' /> Add option
          </Button>
        ) : null}
      </div>
      <div className='space-y-1.5'>
        {draft.options.map((opt, idx) => (
          <div key={idx} className='flex items-center gap-2'>
            <button
              type='button'
              className='shrink-0'
              onClick={() => {
                if (draft.question_type === 'TRUE_FALSE') markSingleCorrect(idx);
                else updateOption(idx, { is_correct: !opt.is_correct });
              }}
              aria-label={opt.is_correct ? 'Marked correct' : 'Mark correct'}
            >
              <CheckCircle2
                className={`w-4 h-4 ${
                  opt.is_correct ? 'text-emerald-600' : 'text-muted-foreground/40'
                }`}
              />
            </button>
            <Input
              className='h-8 text-sm'
              placeholder={`Option ${idx + 1}`}
              value={opt.option_text}
              onChange={(e) => updateOption(idx, { option_text: e.target.value })}
              disabled={draft.question_type === 'TRUE_FALSE'}
            />
            {draft.question_type === 'MCQ' && draft.options.length > 2 ? (
              <Button
                variant='ghost'
                size='icon'
                className='h-7 w-7 text-destructive'
                onClick={() => removeOption(idx)}
              >
                <X className='w-3.5 h-3.5' />
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
