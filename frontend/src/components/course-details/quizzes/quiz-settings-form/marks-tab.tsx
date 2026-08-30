'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { QuizQuestionType } from '@/lib/course-details/services/quizzes-types';
import {
  quizFormCheckboxClass,
  quizFormFieldClass,
  quizFormHintClass,
  quizFormLabelClass,
  quizFormRowClass
} from '../new-quiz-page/field-styles';
import type { FormState } from './form-state';
import { questionTypesForMode } from '../quiz-question-types';

const TYPE_META: Record<QuizQuestionType, string> = {
  MCQ: 'Multiple Choice',
  TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short Answer'
};

interface MarksTabProps {
  form: FormState;
  /// Widened beyond the other tabs' plain `(next: FormState) => void` so
  /// `toggleType` can use a functional update — two checkbox clicks fired
  /// back-to-back (before React re-renders between them) would otherwise
  /// both read the same stale `form` snapshot and the second click would
  /// silently clobber the first's change instead of both applying.
  setForm: (next: FormState | ((prev: FormState) => FormState)) => void;
  /// Skips the intro line — the create-quiz page carries the same
  /// explanation on its section header, so showing both repeats it.
  hideIntro?: boolean;
}

/// Optional marks-distribution plan: total marks, which question-type
/// sections the quiz uses, and how the total splits across them. Purely a
/// planning aid — saved on the quiz so the Questions builder can read it
/// back and render one section per selected type, each with its own
/// type-locked "Add Question" button. Doesn't affect scoring or validation
/// against actual question points.
export function MarksTab({ form, setForm, hideIntro }: MarksTabProps) {
  const typeOrder = questionTypesForMode(form.mode);

  const toggleType = (type: QuizQuestionType) => {
    setForm((prev) => {
      const has = prev.marksPlanTypes.includes(type);
      return {
        ...prev,
        marksPlanTypes: has
          ? prev.marksPlanTypes.filter((t) => t !== type)
          : [...prev.marksPlanTypes, type]
      };
    });
  };

  const allocated = form.marksPlanTypes.reduce(
    (sum, t) => sum + (form.marksPlanAllocations[t] ?? 0),
    0
  );
  const remaining = form.marksPlanTotal - allocated;

  // Caps each section's input at what's left of the total once every
  // other section's allocation is accounted for, so typing/scrolling past
  // the budget clamps instead of producing an "over by N" number.
  const maxFor = (type: QuizQuestionType) => {
    const otherAllocated = allocated - (form.marksPlanAllocations[type] ?? 0);
    return Math.max(form.marksPlanTotal - otherAllocated, 0);
  };

  const setAllocation = (type: QuizQuestionType, value: number, input?: HTMLInputElement) => {
    setForm((prev) => {
      const parsed = Math.max(0, value);
      const otherAllocated = prev.marksPlanTypes.reduce(
        (sum, t) => (t === type ? sum : sum + (prev.marksPlanAllocations[t] ?? 0)),
        0
      );
      const nextTotal = Math.max(prev.marksPlanTotal, otherAllocated + parsed);
      const clamped = Math.min(parsed, Math.max(nextTotal - otherAllocated, 0));
      if (input) syncInput(input, clamped);
      return {
        ...prev,
        marksPlanTotal: nextTotal,
        marksPlanAllocations: { ...prev.marksPlanAllocations, [type]: clamped }
      };
    });
  };

  /// Typing "5" into a field showing "0" leaves the DOM holding "05". The
  /// parsed value is still 5, so React sees the same `value` prop as before
  /// and skips the DOM write that would have normalised it — the field keeps
  /// showing "05" until something else forces a re-render. Writing the
  /// canonical string back onto the element closes that gap.
  const syncInput = (el: HTMLInputElement, canonical: number) => {
    if (el.value !== String(canonical)) el.value = String(canonical);
  };

  return (
    <div className='space-y-4 mt-4'>
      {hideIntro ? null : (
        <p className={quizFormHintClass}>
          Optional — decide how many marks each kind of question is worth. Pick any below and
          you&apos;ll get a separate section for it when you add questions.
        </p>
      )}

      <div className='w-40'>
        <Label className={quizFormLabelClass}>Total marks</Label>
        <Input
          type='number'
          min={1}
          value={form.marksPlanTotal}
          onChange={(e) => {
            const next = Math.max(1, parseInt(e.target.value, 10) || 1);
            syncInput(e.target, next);
            setForm((prev) => ({ ...prev, marksPlanTotal: next }));
          }}
          className={`mt-1.5 ${quizFormFieldClass} max-w-[10rem]`}
        />
      </div>

      <div>
        <Label className={`${quizFormLabelClass} mb-2 block`}>
          Which kinds of question will this quiz have?
        </Label>
        <div className='flex flex-wrap gap-3'>
          {typeOrder.map((type) => (
            <label
              key={type}
              className='flex cursor-pointer items-center gap-2.5 rounded-full border border-border/90 bg-card px-4 py-2.5 text-sm text-foreground hover:border-primary/30 hover:bg-secondary/50'
            >
              <Checkbox
                checked={form.marksPlanTypes.includes(type)}
                onCheckedChange={() => toggleType(type)}
                className={quizFormCheckboxClass}
              />
              {TYPE_META[type]}
            </label>
          ))}
        </div>
      </div>

      {form.marksPlanTypes.length > 0 && (
        <div className='space-y-3'>
          {form.marksPlanTypes.map((type) => (
            <div key={type} className={`flex items-center gap-4 ${quizFormRowClass}`}>
              <div className='w-32 shrink-0'>
                <Label className={quizFormLabelClass}>{TYPE_META[type]}</Label>
              </div>
              <div className='flex items-center gap-2'>
                <span className={quizFormHintClass}>Marks</span>
                <Input
                  type='number'
                  min={0}
                  max={maxFor(type)}
                  value={form.marksPlanAllocations[type] ?? 0}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10) || 0;
                    setAllocation(type, parsed, e.target);
                  }}
                  className={`${quizFormFieldClass} h-10 w-24 px-3`}
                />
              </div>
            </div>
          ))}

          <div
            className={`rounded-xl border p-3 text-sm ${
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
                Assigned: <strong>{allocated}</strong>
              </span>
              <span>
                {remaining === 0 ? (
                  <span className='text-emerald-700 dark:text-emerald-400 font-medium'>
                    ✓ All {form.marksPlanTotal} marks assigned
                  </span>
                ) : remaining > 0 ? (
                  <span className='text-amber-700 dark:text-amber-400'>
                    {remaining} still to assign
                  </span>
                ) : (
                  <span className='text-amber-700 dark:text-amber-400'>
                    {-remaining} too many assigned
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
