'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { ArrowRight } from 'lucide-react';
import type { Assignment, Submission } from '../../api/assignments-types';
import type { GroupRow, Outcome } from './shared';
import { PerMemberGrades } from './per-member-grades';

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
  nextSubmission,
  gradePending,
  extensionPending,
  onSaveGrade,
  onSaveIndividual,
  onExtend,
  onMarkMissing
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
  nextSubmission: Submission | null;
  gradePending: boolean;
  extensionPending: boolean;
  onSaveGrade: (next: Submission | null) => void;
  onSaveIndividual: () => void;
  onExtend: () => void;
  onMarkMissing: () => void;
}) {
  const cap = assignment.maxMarks ?? 100;
  const perMember =
    outcome === 'grade' && assignment.workMode === 'GROUP' &&
    assignment.gradingScope === 'INDIVIDUAL' && submission.groupId != null;
  return (
    <div className='rounded-3xl border bg-card p-4 space-y-4 shadow-sm'>
      <div className='flex items-center justify-between gap-2'>
        <Label className='text-sm font-medium'>Outcome</Label>
        <SegmentedControl
          ariaLabel='Submission grading outcome'
          value={outcome}
          onChange={setOutcome}
          options={[
            { value: 'grade', label: 'Grade' },
            { value: 'extend', label: 'Extend' },
            { value: 'missing', label: 'Mark missing' }
          ]}
        />
      </div>

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
          onSave={onSaveIndividual}
        />
      ) : outcome === 'grade' ? (
        <div className='flex flex-wrap items-center gap-2'>
          <Input
            type='number'
            min={0}
            max={cap}
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder={`0-${cap}`}
            className='w-32'
          />
          <Button size='sm' onClick={() => onSaveGrade(null)} disabled={gradePending}>
            {gradePending ? 'Saving…' : 'Save grade'}
          </Button>
          {nextSubmission ? (
            <Button
              size='sm'
              variant='outline'
              className='gap-1'
              onClick={() => onSaveGrade(nextSubmission)}
              disabled={gradePending}
              title='Save this grade and jump to the next submission'
            >
              Save & Next
              <ArrowRight className='w-3.5 h-3.5' />
            </Button>
          ) : null}
        </div>
      ) : null}
      {outcome === 'extend' ? (
        <div className='space-y-2'>
          <Input
            type='datetime-local'
            value={extensionDate}
            onChange={(e) => setExtensionDate(e.target.value)}
          />
          <Input
            placeholder='Reason (optional)'
            value={extensionReason}
            onChange={(e) => setExtensionReason(e.target.value)}
          />
          <Button size='sm' variant='outline' onClick={onExtend} disabled={extensionPending}>
            {assignment.gradingScope === 'GROUP' ? 'Grant to group' : 'Grant another chance'}
          </Button>
        </div>
      ) : null}
      {outcome === 'missing' ? (
        <div className='space-y-2'>
          <p className='text-xs text-muted-foreground'>
            Mark reviewed without a grade (no score shown).
          </p>
          <Button size='sm' variant='outline' onClick={onMarkMissing} disabled={gradePending}>
            Save without grade
          </Button>
        </div>
      ) : null}
    </div>
  );
}
