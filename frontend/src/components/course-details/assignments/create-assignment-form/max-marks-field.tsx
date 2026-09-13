import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CourseMarkBudget } from '@/lib/course-details/services/mark-budget-service';
import { effectiveMarkBudgetRemaining } from '@/lib/course-details/services/mark-budget-utils';
import { assignmentFormFieldClass } from './field-styles';

interface MaxMarksFieldProps {
  value: number;
  onBlur: () => void;
  onChange: (value: number) => void;
  error?: string;
  markBudget?: CourseMarkBudget;
  excludePublishedMarks?: number;
  courseMaxMarks?: number;
}

export function MaxMarksField({
  value,
  onBlur,
  onChange,
  error,
  markBudget,
  excludePublishedMarks = 0,
  courseMaxMarks
}: MaxMarksFieldProps) {
  const courseMax = courseMaxMarks ?? markBudget?.courseMax ?? 100;
  const available =
    markBudget != null
      ? effectiveMarkBudgetRemaining(markBudget, excludePublishedMarks)
      : null;
  const overBudget = available != null && value > 0 && value > available;

  return (
    <div className='space-y-1'>
      <Label htmlFor='maxMarks'>Course marks (of {courseMax})</Label>
      <Input
        id='maxMarks'
        type='number'
        min={1}
        max={courseMax}
        value={value}
        onBlur={onBlur}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') {
            onChange(0);
            return;
          }
          const parsed = Number(raw);
          if (!Number.isFinite(parsed)) return;
          const upper =
            available != null ? Math.min(courseMax, available) : courseMax;
          onChange(Math.min(upper, Math.max(1, Math.trunc(parsed))));
        }}
        placeholder='10'
        className={assignmentFormFieldClass}
      />
      {available != null ? (
        <p className='text-[11px] text-muted-foreground'>
          <span className='font-medium tabular-nums text-foreground'>{available}</span> of{' '}
          {courseMax} course marks available for published work.
        </p>
      ) : (
        <p className='text-[11px] text-muted-foreground'>
          Share of the course&apos;s {courseMax} marks for this assignment when published.
        </p>
      )}
      {overBudget ? (
        <p className='text-xs text-destructive'>
          Exceeds available marks — lower this value or unpublish other assignments/quizzes.
        </p>
      ) : null}
      {error && <p className='text-xs text-destructive'>{error}</p>}
    </div>
  );
}
