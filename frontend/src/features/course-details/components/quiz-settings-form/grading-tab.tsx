'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle } from 'lucide-react';
import type { Quiz } from '../../api/quizzes-types';
import type { FormState } from './form-state';

interface GradingTabProps {
  form: FormState;
  setForm: (next: FormState) => void;
  editing: Quiz | null;
}

export function GradingTab({ form, setForm, editing }: GradingTabProps) {
  const attempts = editing?._count?.attempts ?? 0;

  return (
    <div className='space-y-3 mt-4'>
      <div className='space-y-1.5'>
        <Label htmlFor='quiz-pass'>Passing score (%)</Label>
        <Input
          id='quiz-pass'
          type='number'
          min={0}
          max={100}
          value={form.passing_score}
          onChange={(e) =>
            setForm({
              ...form,
              passing_score: Math.min(100, Math.max(0, Number(e.target.value) || 0))
            })
          }
        />
        <p className='text-[11px] text-muted-foreground'>
          Students see &quot;Passed&quot; or &quot;Failed&quot; on review when their score crosses this
          line.
        </p>
      </div>

      {editing && attempts > 0 ? (
        <div className='flex items-start gap-2 rounded-md border border-amber-300/40 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs'>
          <AlertTriangle className='w-4 h-4 text-amber-600 shrink-0 mt-0.5' />
          <div>
            <p className='font-medium text-amber-900 dark:text-amber-200'>
              {attempts} attempt{attempts === 1 ? '' : 's'} already submitted
            </p>
            <p className='text-amber-800 dark:text-amber-300'>
              Changing the passing score does NOT re-grade past attempts. Their stored score
              and pass/fail flag are frozen at submit time.
            </p>
          </div>
        </div>
      ) : null}

      <div className='flex items-center justify-between rounded-md border p-3'>
        <div className='space-y-0.5'>
          <p className='text-sm font-medium'>Confidence-based scoring</p>
          <p className='text-[11px] text-muted-foreground'>
            Students rate LOW / MED / HIGH on each MCQ or True/False. Correct high-confidence
            answers earn full credit; wrong high-confidence answers lose partial credit.
          </p>
        </div>
        <Switch
          checked={form.confidence_scoring}
          onCheckedChange={(v) => setForm({ ...form, confidence_scoring: v })}
        />
      </div>
    </div>
  );
}
