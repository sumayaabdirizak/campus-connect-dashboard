'use client';

import { useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CourseMarkBudget } from '@/lib/course-details/services/mark-budget-service';
import {
  effectiveMarkBudgetRemaining
} from '@/lib/course-details/services/mark-budget-utils';
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
  markBudget?: CourseMarkBudget;
  excludePublishedMarks?: number;
  /** Uploaded paper quiz — only total marks, no question-type sections. */
  uploadedOnly?: boolean;
}

type MarksPlanSlice = Pick<
  FormState,
  'marksPlanTotal' | 'marksPlanTypes' | 'marksPlanAllocations'
>;

function sumAllocations(
  types: QuizQuestionType[],
  allocations: Partial<Record<QuizQuestionType, number>>
): number {
  return types.reduce((sum, t) => sum + (allocations[t] ?? 0), 0);
}

/// Keep quiz marks within the course budget — section inputs used to grow
/// marksPlanTotal past the cap by auto-expanding the total.
function clampMarksPlanToBudget(plan: MarksPlanSlice, maxPlanTotal: number): MarksPlanSlice {
  const marksPlanTotal = Math.min(Math.max(1, plan.marksPlanTotal), maxPlanTotal);
  const marksPlanAllocations = { ...plan.marksPlanAllocations };

  for (const type of plan.marksPlanTypes) {
    const other = sumAllocations(
      plan.marksPlanTypes.filter((t) => t !== type),
      marksPlanAllocations
    );
    const cap = Math.max(marksPlanTotal - other, 0);
    const current = marksPlanAllocations[type] ?? 0;
    if (current > cap) marksPlanAllocations[type] = cap;
  }

  let allocated = sumAllocations(plan.marksPlanTypes, marksPlanAllocations);
  if (allocated > marksPlanTotal) {
    let overflow = allocated - marksPlanTotal;
    for (let i = plan.marksPlanTypes.length - 1; i >= 0 && overflow > 0; i -= 1) {
      const type = plan.marksPlanTypes[i];
      const current = marksPlanAllocations[type] ?? 0;
      const take = Math.min(current, overflow);
      marksPlanAllocations[type] = current - take;
      overflow -= take;
    }
  }

  return {
    marksPlanTotal,
    marksPlanTypes: plan.marksPlanTypes,
    marksPlanAllocations
  };
}

/// Optional marks-distribution plan: total marks, which question-type
/// sections the quiz uses, and how the total splits across them. Purely a
/// planning aid — saved on the quiz so the Questions builder can read it
/// back and render one section per selected type, each with its own
/// type-locked "Add Question" button. Doesn't affect scoring or validation
/// against actual question points.
export function MarksTab({
  form,
  setForm,
  hideIntro,
  markBudget,
  excludePublishedMarks = 0,
  uploadedOnly = false
}: MarksTabProps) {
  const typeOrder = questionTypesForMode(form.mode);
  const courseMax = markBudget?.courseMax ?? 100;
  const courseAvailable =
    markBudget != null
      ? effectiveMarkBudgetRemaining(markBudget, excludePublishedMarks)
      : null;
  const maxPlanTotal = courseAvailable ?? courseMax;

  // Sanitize if budget loads after the form already holds inflated values.
  useEffect(() => {
    if (courseAvailable == null) return;
    setForm((prev) => {
      if (
        prev.marksPlanTotal <= maxPlanTotal &&
        sumAllocations(prev.marksPlanTypes, prev.marksPlanAllocations) <= maxPlanTotal
      ) {
        return prev;
      }
      const clamped = clampMarksPlanToBudget(prev, maxPlanTotal);
      return { ...prev, ...clamped };
    });
  }, [courseAvailable, maxPlanTotal, setForm]);

  const allocated = sumAllocations(form.marksPlanTypes, form.marksPlanAllocations);
  const remaining = form.marksPlanTotal - allocated;
  const overCourseBudget = form.marksPlanTotal > maxPlanTotal || allocated > maxPlanTotal;

  const toggleType = (type: QuizQuestionType) => {
    setForm((prev) => {
      const has = prev.marksPlanTypes.includes(type);
      const nextTypes = has
        ? prev.marksPlanTypes.filter((t) => t !== type)
        : [...prev.marksPlanTypes, type];
      const next = {
        ...prev,
        marksPlanTypes: nextTypes,
        marksPlanAllocations: has
          ? { ...prev.marksPlanAllocations, [type]: undefined }
          : prev.marksPlanAllocations
      };
      return courseAvailable != null
        ? { ...next, ...clampMarksPlanToBudget(next, maxPlanTotal) }
        : next;
    });
  };

  // Caps each section at the lesser of internal plan room and course budget.
  const maxFor = (type: QuizQuestionType) => {
    const otherAllocated = allocated - (form.marksPlanAllocations[type] ?? 0);
    const byPlan = Math.max(form.marksPlanTotal - otherAllocated, 0);
    const byCourse = Math.max(maxPlanTotal - otherAllocated, 0);
    return Math.min(byPlan, byCourse);
  };

  const setAllocation = (type: QuizQuestionType, value: number, input?: HTMLInputElement) => {
    setForm((prev) => {
      const parsed = Math.max(0, value);
      const otherAllocated = prev.marksPlanTypes.reduce(
        (sum, t) => (t === type ? sum : sum + (prev.marksPlanAllocations[t] ?? 0)),
        0
      );
      const roomInPlan = Math.max(prev.marksPlanTotal - otherAllocated, 0);
      const roomInCourse = Math.max(maxPlanTotal - otherAllocated, 0);
      const clamped = Math.min(parsed, roomInPlan, roomInCourse);
      const nextTotal = Math.min(
        maxPlanTotal,
        Math.max(prev.marksPlanTotal, otherAllocated + clamped)
      );
      if (input) syncInput(input, clamped);
      const next = {
        ...prev,
        marksPlanTotal: nextTotal,
        marksPlanAllocations: { ...prev.marksPlanAllocations, [type]: clamped }
      };
      return courseAvailable != null
        ? { ...next, ...clampMarksPlanToBudget(next, maxPlanTotal) }
        : next;
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

  const planBalanced = remaining === 0;
  const summaryTone =
    overCourseBudget
      ? 'border-destructive/40 bg-destructive/10 dark:bg-destructive/20'
      : planBalanced
        ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30'
        : 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30';

  return (
    <div className='space-y-4 mt-4'>
      {hideIntro ? null : uploadedOnly ? (
        <p className={quizFormHintClass}>
          Set how many course marks this paper quiz is worth. You&apos;ll enter each
          student&apos;s score in Attempts after creating the quiz.
        </p>
      ) : (
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
          max={maxPlanTotal}
          value={form.marksPlanTotal}
          onChange={(e) => {
            const parsed = Math.max(1, parseInt(e.target.value, 10) || 1);
            const next = Math.min(parsed, maxPlanTotal);
            syncInput(e.target, next);
            setForm((prev) => {
              const merged = { ...prev, marksPlanTotal: next };
              return courseAvailable != null
                ? { ...merged, ...clampMarksPlanToBudget(merged, maxPlanTotal) }
                : merged;
            });
          }}
          className={`mt-1.5 ${quizFormFieldClass} max-w-[10rem]`}
        />
        {courseAvailable != null ? (
          <p className={`mt-1.5 ${quizFormHintClass}`}>
            <span className='font-medium tabular-nums text-foreground'>{courseAvailable}</span> of{' '}
            {courseMax} course marks available for published work.
          </p>
        ) : null}
        {overCourseBudget ? (
          <p className='mt-1 text-xs text-destructive'>
            Exceeds available course marks — lower this value or unpublish other assignments/quizzes.
          </p>
        ) : null}
      </div>

      {uploadedOnly ? null : (
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
      )}

      {uploadedOnly ? null : form.marksPlanTypes.length > 0 && (
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

          <div className={`rounded-xl border p-3 text-sm ${summaryTone}`}>
            <div className='flex flex-wrap gap-x-4 gap-y-1'>
              <span>
                Total: <strong>{form.marksPlanTotal}</strong>
                {courseAvailable != null ? (
                  <span className='text-muted-foreground'> / {maxPlanTotal} course max</span>
                ) : null}
              </span>
              <span>
                Assigned: <strong>{allocated}</strong>
              </span>
              <span>
                {overCourseBudget ? (
                  <span className='font-medium text-destructive'>
                    Over course mark budget — lower marks above
                  </span>
                ) : remaining === 0 ? (
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
