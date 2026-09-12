'use client';

import { useEffect } from 'react';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMySubmission } from '@/lib/course-details/queries/assignments-queries';
import type { Assignment } from '@/lib/course-details/services/assignments-types';
import { useCourseLiveNow } from '@/components/course-details/course-live-clock';
import { CourseTabPage } from '../../_shared/course-tab-page';
import {
  getAssignmentDisplayStatus,
  resolveAssignmentCardTiming
} from './assignment-card-state';
import { AssignmentStatusPill } from './assignment-status-pill';
import { CardDetailsPanel } from './card-details-panel';

export function StudentAssignmentDetailPage({
  assignment: a,
  onBack,
  submitMode,
  onSubmitModeChange,
  submitUrl,
  onSubmitUrlChange,
  pendingFile,
  onPendingFileChange,
  fileInputRef,
  isSubmitting,
  onSubmit
}: {
  assignment: Assignment;
  onBack: () => void;
  submitMode: 'link' | 'file';
  onSubmitModeChange: (mode: 'link' | 'file') => void;
  submitUrl: string;
  onSubmitUrlChange: (v: string) => void;
  pendingFile: File | null;
  onPendingFileChange: (f: File | null) => void;
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  isSubmitting: boolean;
  onSubmit: () => void;
}) {
  useCourseLiveNow();

  const listSub = a.submissions?.[0];
  const { data: rawMySubmission, refetch: refetchMySubmission } = useMySubmission(a.id, {
    live: true
  });

  useEffect(() => {
    void refetchMySubmission();
  }, [a.id, refetchMySubmission]);

  const extension = rawMySubmission?._extension ?? a._extension ?? null;
  const mySubmission =
    rawMySubmission && !('_noSubmission' in rawMySubmission) ? rawMySubmission : null;
  const groupInfo = rawMySubmission?._groupInfo ?? null;

  const timing = resolveAssignmentCardTiming(a, mySubmission, groupInfo, extension);
  const grade = mySubmission?.grade ?? listSub?.grade ?? null;
  const isLate = mySubmission?.is_late ?? false;
  const status = getAssignmentDisplayStatus(timing, {
    grade,
    isLate,
    maxMarks: a.maxMarks ?? 100
  });

  const dueLine = timing.hasExtension
    ? `Extended to ${format(timing.due, 'MMM d, yyyy · h:mm a')}`
    : `Due ${format(timing.due, 'MMM d, yyyy · h:mm a')}`;

  return (
    <CourseTabPage>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <Button
          type='button'
          variant='ghost'
          onClick={onBack}
          className='gap-1 shrink-0 pl-0 hover:bg-transparent'
        >
          <ArrowLeft className='size-4' /> Back to assignments
        </Button>
        <AssignmentStatusPill label={status.label} tone={status.tone} />
      </div>

      <div className='rounded-xl border bg-card px-5 py-5 text-foreground sm:px-6'>
        <div className='space-y-1'>
          <p className='text-sm text-muted-foreground'>{dueLine}</p>
          <h2 className='text-2xl tracking-tight text-foreground font-display'>{a.title}</h2>
          <p className='text-sm text-muted-foreground'>
            {a.maxMarks ?? 100} pts
            {a.attachments && a.attachments.length > 0
              ? ` · ${a.attachments.length} attachment${a.attachments.length === 1 ? '' : 's'}`
              : ''}
          </p>
        </div>

        {a.description ? (
          <p className='mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground'>
            {a.description}
          </p>
        ) : null}

        <div className='mt-6 border-t border-border/70 pt-5'>
          <CardDetailsPanel
            assignment={a}
            timing={timing}
            mySubmission={mySubmission}
            groupInfo={groupInfo}
            submitProps={{
              submitMode,
              onSubmitModeChange,
              submitUrl,
              onSubmitUrlChange,
              pendingFile,
              onPendingFileChange,
              fileInputRef,
              isSubmitting,
              onSubmit
            }}
          />
        </div>
      </div>
    </CourseTabPage>
  );
}
