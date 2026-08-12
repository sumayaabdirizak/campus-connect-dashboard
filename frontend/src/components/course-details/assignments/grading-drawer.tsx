'use client';

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { StudentContextRail } from '../_shared/student-context-rail';
import { PdfViewer, isPdfUrl } from '../quizzes/pdf-viewer';
import type { Assignment, Submission } from '@/lib/course-details/services/assignments-types';
import type { GroupRow, Outcome } from './shared';
import { DrawerIdentity } from './drawer-identity';
import { FeedbackTemplatesPanel } from './feedback-templates-panel';
import { GradingOutcomePanel } from './grading-outcome-panel';

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
  onMarkMissing: () => void;
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
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent className='w-full overflow-y-auto bg-background/95 sm:max-w-5xl'>
        <SheetTitle className='sr-only'>Review submission</SheetTitle>
        {sub ? (
          <div className='grid gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_320px]'>
            <div className='min-w-0 space-y-4'>
              <DrawerIdentity
                assignment={props.assignment}
                submission={sub}
                allGroupRows={props.allGroupRows}
              />
              {sub.content_url ? (
                isPdfUrl(sub.content_url) ? (
                  <div className='overflow-hidden rounded-3xl border bg-card shadow-sm'>
                    <PdfViewer url={sub.content_url} />
                  </div>
                ) : null
              ) : (
                <p className='text-xs text-muted-foreground italic'>No file attached.</p>
              )}
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
                onMarkMissing={props.onMarkMissing}
              />
            </div>
            <div className='space-y-4 lg:sticky lg:top-4'>
              {sub.student ? (
                <StudentContextRail
                  courseId={props.courseId}
                  studentId={sub.student.id}
                  studentName={sub.student.full_name}
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
