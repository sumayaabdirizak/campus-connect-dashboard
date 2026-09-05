'use client';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { ArrowRight, Loader2 } from 'lucide-react';
import type { Assignment, Submission } from '@/lib/course-details/services/assignments-types';
import type { GroupRow, Outcome } from './shared';
import { cn } from '@/lib/utils';
import { isSubmissionGraded } from './shared';
import { FeedbackTemplatesPanel } from './feedback-templates-panel';
import { GradingOutcomePanel } from './grading-outcome-panel';
import { GradingDrawerSubmission } from './grading-drawer-submission';
import { GradingDrawerStatusBadge, studentInitials } from './grading-drawer-status';
import { gradingBlue } from './grading-drawer-blue';
import { isPastExtensionDate } from './extension-date-utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  assignment: Assignment;
  submission: Submission | null;
  allGroupRows: GroupRow[];
  submissions: Submission[];
  outcome: Outcome;
  setOutcome: (o: Outcome) => void;
  grade: string;
  setGrade: (v: string) => void;
  feedback: string;
  setFeedback: (v: string) => void;
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
  templates: string[];
  templatesMenuOpen: boolean;
  setTemplatesMenuOpen: (u: boolean | ((v: boolean) => boolean)) => void;
  newTemplate: string;
  setNewTemplate: (v: string) => void;
  persistTemplates: (next: string[]) => void;
  insertTemplate: (text: string) => void;
};

export function GradingDrawer(props: Props) {
  const sub = props.submission;
  const isGraded = sub != null && isSubmissionGraded(sub);
  const cap = props.assignment.maxMarks ?? 100;
  const perMember =
    props.outcome === 'grade' &&
    props.assignment.workMode === 'GROUP' &&
    props.assignment.gradingScope === 'INDIVIDUAL' &&
    sub?.groupId != null;

  const footerPrimary = (() => {
    if (!sub) return null;
    if (perMember) {
      return {
        label: props.gradePending ? 'Saving…' : 'Save',
        disabled: props.gradePending,
        onClick: () => props.onSaveIndividual()
      };
    }
    if (props.outcome === 'extend' && !isGraded) {
      return {
        label: props.extensionPending ? 'Saving…' : 'Grant extension',
        disabled:
          props.extensionPending ||
          !props.extensionDate ||
          isPastExtensionDate(props.extensionDate),
        onClick: () => props.onExtend()
      };
    }
    return {
      label: props.gradePending ? 'Saving…' : isGraded ? 'Update grade' : 'Save grade',
      disabled: props.gradePending,
      onClick: () => props.onSaveGrade(null)
    };
  })();

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent
        className={cn(
          'flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg',
          gradingBlue.sheetBg
        )}
      >
        <SheetTitle className='sr-only'>Grade submission</SheetTitle>

        {sub ? (
          <>
            <header
              className={cn(
                'shrink-0 border-b border-border px-5 py-4',
                gradingBlue.headerBg
              )}
            >
              <div className='flex items-start gap-3'>
                <span
                  className={cn(
                    'flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                    gradingBlue.avatar
                  )}
                  aria-hidden
                >
                  {studentInitials(sub.student?.full_name)}
                </span>
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-base font-semibold text-foreground'>
                    {sub.student?.full_name ?? 'Student'}
                  </p>
                  <p className='text-xs text-muted-foreground'>{sub.student?.number ?? '—'}</p>
                  <GradingDrawerStatusBadge sub={sub} cap={cap} />
                </div>
              </div>
            </header>

            <div className='min-h-0 flex-1 overflow-y-auto px-4 py-4'>
              <div className='space-y-4'>
                <GradingDrawerSubmission submission={sub} />
                <GradingOutcomePanel
                  assignment={props.assignment}
                  submission={sub}
                  allGroupRows={props.allGroupRows}
                  submissions={props.submissions}
                  outcome={props.outcome}
                  setOutcome={props.setOutcome}
                  grade={props.grade}
                  setGrade={props.setGrade}
                  extensionDate={props.extensionDate}
                  setExtensionDate={props.setExtensionDate}
                  extensionReason={props.extensionReason}
                  setExtensionReason={props.setExtensionReason}
                  memberGrades={props.memberGrades}
                  setMemberGrades={props.setMemberGrades}
                  memberFeedbacks={props.memberFeedbacks}
                  setMemberFeedbacks={props.setMemberFeedbacks}
                  nextSubmission={props.nextSubmission}
                  gradePending={props.gradePending}
                  extensionPending={props.extensionPending}
                  onSaveGrade={props.onSaveGrade}
                  onSaveIndividual={props.onSaveIndividual}
                  onExtend={props.onExtend}
                />
                {(props.outcome !== 'extend' || isGraded) && (
                  <FeedbackTemplatesPanel
                    feedback={props.feedback}
                    onFeedbackChange={props.setFeedback}
                    templates={props.templates}
                    templatesMenuOpen={props.templatesMenuOpen}
                    setTemplatesMenuOpen={props.setTemplatesMenuOpen}
                    newTemplate={props.newTemplate}
                    setNewTemplate={props.setNewTemplate}
                    persistTemplates={props.persistTemplates}
                    insertTemplate={props.insertTemplate}
                  />
                )}
              </div>
            </div>

            {footerPrimary ? (
              <footer
                className={cn(
                  'shrink-0 border-t border-border px-4 py-3',
                  gradingBlue.footerBg
                )}
              >
                <div className='flex items-center justify-end gap-2'>
                  {props.nextSubmission &&
                  (props.outcome === 'grade' || isGraded) &&
                  !perMember ? (
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className={cn('gap-1', gradingBlue.outlineBtn)}
                      disabled={props.gradePending}
                      title='Save this student and open the next one'
                      onClick={() => props.onSaveGrade(props.nextSubmission)}
                    >
                      Save & next
                      <ArrowRight className='size-4' />
                    </Button>
                  ) : null}
                  <Button
                    type='button'
                    size='sm'
                    className={cn('min-w-[7.5rem]', gradingBlue.saveBtn)}
                    disabled={footerPrimary.disabled}
                    onClick={footerPrimary.onClick}
                  >
                    {(props.gradePending || props.extensionPending) && (
                      <Loader2 className='mr-1.5 size-4 animate-spin' />
                    )}
                    {footerPrimary.label}
                  </Button>
                </div>
              </footer>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
