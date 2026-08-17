'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { QuizQuestionType } from '@/lib/course-details/services/quizzes-types';
import type { FormState } from './form-state';

const TYPE_META: Record<QuizQuestionType, string> = {
  MCQ: 'Multiple Choice',
  TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short Answer'
};
const TYPE_ORDER: QuizQuestionType[] = ['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER'];

interface MarksTabProps {
  form: FormState;
  setForm: (next: FormState) => void;
}

/// Optional marks-distribution plan: total marks, which question-type
/// sections the quiz uses, and how the total splits across them. Purely a
/// planning aid — saved on the quiz so the Questions builder can read it
/// back and render one section per selected type, each with its own
/// type-locked "Add Question" button. Doesn't affect scoring or validation
/// against actual question points.
export function MarksTab({ form, setForm }: MarksTabProps) {
  const toggleType = (type: QuizQuestionType) => {
    const has = form.marksPlanTypes.includes(type);
    setForm({
      ...form,
      marksPlanTypes: has
        ? form.marksPlanTypes.filter((t) => t !== type)
        : [...form.marksPlanTypes, type]
    });
  };

  const setAllocation = (type: QuizQuestionType, value: number) => {
    setForm({
      ...form,
      marksPlanAllocations: { ...form.marksPlanAllocations, [type]: value }
    });
  };

  const allocated = form.marksPlanTypes.reduce(
    (sum, t) => sum + (form.marksPlanAllocations[t] ?? 0),
    0
  );
  const remaining = form.marksPlanTotal - allocated;

  return (
    <div className='space-y-4 mt-4'>
      <p className='text-xs text-muted-foreground'>
        Optional — sketch out how marks split across question types. The Questions page will
        show a section per type you pick here, each with its own "Add Question" button.
      </p>

      <div className='w-40'>
        <Label className='text-xs font-medium'>Total Marks</Label>
        <Input
          type='number'
          min={1}
          value={form.marksPlanTotal}
          onChange={(e) =>
            setForm({ ...form, marksPlanTotal: parseInt(e.target.value, 10) || 0 })
          }
          className='mt-1.5 h-9 text-sm'
        />
      </div>

      <div>
        <Label className='text-xs font-medium mb-2 block'>Sections</Label>
        <div className='flex flex-wrap gap-4'>
          {TYPE_ORDER.map((type) => (
            <label key={type} className='flex items-center gap-2 text-sm cursor-pointer'>
              <Checkbox
                checked={form.marksPlanTypes.includes(type)}
                onCheckedChange={() => toggleType(type)}
              />
              {TYPE_META[type]}
            </label>
          ))}
        </div>
      </div>

      {form.marksPlanTypes.length > 0 && (
        <div className='space-y-3'>
          {form.marksPlanTypes.map((type) => (
            <div key={type} className='flex items-center gap-4 rounded-lg border p-3'>
              <div className='w-32 shrink-0'>
                <Label className='text-xs font-medium'>{TYPE_META[type]}</Label>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-xs text-muted-foreground'>Marks</span>
                <Input
                  type='number'
                  min={0}
                  value={form.marksPlanAllocations[type] ?? 0}
                  onChange={(e) => setAllocation(type, parseInt(e.target.value, 10) || 0)}
                  className='h-8 w-20 text-sm'
                />
              </div>
            </div>
          ))}

          <div
            className={`rounded-lg border p-3 text-sm ${
              remaining === 0
                ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30'
                : 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30'
            }`}
          >
            <div className='flex flex-wrap gap-x-4 gap-y-1'>
              <span>
                Total: <strong>{form.marksPlanTotal}</strong>
              </span>
              <span>
                Allocated: <strong>{allocated}</strong>
              </span>
              <span>
                {remaining === 0 ? (
                  <span className='text-emerald-700 dark:text-emerald-400 font-medium'>
                    ✓ Fully allocated
                  </span>
                ) : remaining > 0 ? (
                  <span className='text-amber-700 dark:text-amber-400'>{remaining} remaining</span>
                ) : (
                  <span className='text-amber-700 dark:text-amber-400'>Over by {-remaining}</span>
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
