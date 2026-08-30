'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { CalendarClock, CheckCircle2, ClipboardCheck } from 'lucide-react';
import type { Assignment, Submission } from '@/lib/course-details/services/assignments-types';
import type { GroupRow, Outcome } from './shared';
import { PerMemberGrades } from './per-member-grades';
import { GradingDrawerSection } from './grading-drawer-section';
import { handleExtensionDateChange, toDatetimeLocalMin } from './extension-date-utils';
import { gradingBlue } from './grading-drawer-blue';

const TAB_HELP: Record<Outcome, string> = {
  grade: 'Enter the points this student earned.',
  extend: 'Give this student more time to submit or resubmit.',
  missing: 'Mark as reviewed when no grade is needed.'
};

const ACTIONS: {
  id: Outcome;
  label: string;
  icon: typeof ClipboardCheck;
}[] = [
  { id: 'grade', label: 'Give a grade', icon: ClipboardCheck },
  { id: 'extend', label: 'Extend deadline', icon: CalendarClock },
  { id: 'missing', label: 'Mark reviewed', icon: CheckCircle2 }
];

const inputClass = cn(
  'h-10 rounded-lg border-border bg-background',
  gradingBlue.focusRing
);

function ActionTab({
  active,
  label,
  icon: Icon,
  onClick
}: {
  active: boolean;
  label: string;
  icon: typeof ClipboardCheck;
  onClick: () => void;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-center text-xs font-medium transition-all',
        active
          ? gradingBlue.activeTab
          : 'text-muted-foreground hover:bg-background/80 hover:text-foreground'
      )}
    >
      <Icon className='size-4 shrink-0' aria-hidden />
      <span className='leading-tight'>{label}</span>
    </button>
  );
}

export function GradingOutcomePanel({
  assignment,
  submission,
  allGroupRows,
  submissions,
  outcome,
  setOutcome,
  grade,
  setGrade,
  extensionDate,
  setExtensionDate,
  extensionReason,
  setExtensionReason,
  memberGrades,
  setMemberGrades,
  memberFeedbacks,
  setMemberFeedbacks,
  gradePending
}: {
  assignment: Assignment;
  submission: Submission;
  allGroupRows: GroupRow[];
  submissions: Submission[];
  outcome: Outcome;
  setOutcome: (o: Outcome) => void;
  grade: string;
  setGrade: (v: string) => void;
  extensionDate: string;
  setExtensionDate: (v: string) => void;
  extensionReason: string;
  setExtensionReason: (v: string) => void;
  memberGrades: Map<number, string>;
  setMemberGrades: React.Dispatch<React.SetStateAction<Map<number, string>>>;
  memberFeedbacks: Map<number, string>;
  setMemberFeedbacks: React.Dispatch<React.SetStateAction<Map<number, string>>>;
  gradePending: boolean;
  extensionPending: boolean;
  nextSubmission: Submission | null;
  onSaveGrade: (next: Submission | null) => void;
  onSaveIndividual: () => void;
  onExtend: () => void;
  onMarkMissing: () => void;
}) {
  const cap = assignment.maxMarks ?? 100;
  const isGraded = submission.is_reviewed && submission.grade != null;
  const perMember =
    outcome === 'grade' &&
    assignment.workMode === 'GROUP' &&
    assignment.gradingScope === 'INDIVIDUAL' &&
    submission.groupId != null;
  const gradeNum = Number(grade);
  const gradePct =
    grade.trim() !== '' && !Number.isNaN(gradeNum)
      ? Math.round((Math.min(Math.max(gradeNum, 0), cap) / cap) * 100)
      : null;

  return (
    <GradingDrawerSection
      title={isGraded ? 'Update grade' : 'Your action'}
      hint={isGraded ? 'Change the score or feedback, then save.' : TAB_HELP[outcome]}
    >
      {!isGraded ? (
        <div className='mb-4 grid grid-cols-3 gap-1 rounded-xl bg-muted p-1'>
          {ACTIONS.map((action) => (
            <ActionTab
              key={action.id}
              active={outcome === action.id}
              label={action.label}
              icon={action.icon}
              onClick={() => setOutcome(action.id)}
            />
          ))}
        </div>
      ) : null}

      {perMember ? (
        <PerMemberGrades
          assignment={assignment}
          submission={submission}
          allGroupRows={allGroupRows}
          submissions={submissions}
          memberGrades={memberGrades}
          setMemberGrades={setMemberGrades}
          memberFeedbacks={memberFeedbacks}
          setMemberFeedbacks={setMemberFeedbacks}
          gradePending={gradePending}
          onSave={() => {}}
          hideSaveButton
        />
      ) : outcome === 'grade' || isGraded ? (
        <div className='space-y-2'>
          <Label htmlFor='grade-score' className='text-sm font-medium text-foreground'>
            Points earned (out of {cap})
          </Label>
          <div className='flex items-center gap-3'>
            <Input
              id='grade-score'
              type='number'
              min={0}
              max={cap}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder={`e.g. ${Math.round(cap * 0.9)}`}
              className={cn(inputClass, 'max-w-[140px] text-base font-semibold tabular-nums')}
            />
            {gradePct != null ? (
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums',
                  gradingBlue.pctBadge
                )}
              >
                {gradePct}%
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {outcome === 'extend' && !isGraded ? (
        <div className={cn('space-y-3 rounded-lg border p-3', gradingBlue.extendPanel)}>
          <div className='space-y-1.5'>
            <Label className='text-sm font-medium text-foreground'>New due date & time</Label>
            <Input
              type='datetime-local'
              min={toDatetimeLocalMin()}
              value={extensionDate}
              onChange={(e) => handleExtensionDateChange(e.target.value, setExtensionDate)}
              className={inputClass}
            />
          </div>
          <div className='space-y-1.5'>
            <Label className='text-sm font-medium text-foreground'>Reason (optional)</Label>
            <Input
              placeholder='Student can see this note'
              value={extensionReason}
              onChange={(e) => setExtensionReason(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      ) : null}

      {outcome === 'missing' && !isGraded ? (
        <p className={cn('rounded-lg border px-3 py-2.5 text-sm', gradingBlue.reviewHint)}>
          The student will see this assignment as reviewed. No points will be added.
        </p>
      ) : null}
    </GradingDrawerSection>
  );
}
