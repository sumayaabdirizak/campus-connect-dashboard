'use client';

import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  X as XIcon,
} from 'lucide-react';
import { AddToCalendarButton } from '@/components/add-to-calendar-button';
import { format } from 'date-fns';
import type { Assignment, Submission } from '@/lib/course-details/services/assignments-types';

export function AssignmentCardHeader({
  assignment: a,
  courseOfferingPublicId,
  mySubmission,
  openAt,
  due,
  baseDue,
  hasExtension,
  isGraded,
  passed,
  hasSubmitted,
  closed,
  dueSoon,
  dueSoonText,
}: {
  assignment: Assignment;
  courseOfferingPublicId: string;
  mySubmission: Submission | null;
  openAt: Date | null;
  due: Date;
  baseDue: Date;
  hasExtension: boolean;
  isGraded: boolean;
  passed: boolean;
  hasSubmitted: boolean;
  closed: boolean;
  dueSoon: boolean;
  dueSoonText: string | null;
}) {
  return (
    <>
      <div className='flex items-center justify-between mb-2 gap-2 flex-wrap'>
        <span className='font-medium truncate'>{a.title}</span>
        <div className='flex gap-1 flex-wrap'>
          {isGraded ? (
            <Badge
              variant='outline'
              className={`gap-1 ${
                passed
                  ? 'text-success border-success'
                  : 'text-destructive border-destructive/40'
              }`}
            >
              <CheckCircle2 className='w-3 h-3' />
              Graded · {mySubmission?.grade}%
            </Badge>
          ) : hasSubmitted ? (
            <Badge variant='success' className='gap-1'>
              <Check className='w-3 h-3' />
              Submitted
            </Badge>
          ) : closed ? (
            <Badge variant='destructive' className='gap-1'>
              <XIcon className='w-3 h-3' />
              Missed
            </Badge>
          ) : dueSoon ? (
            <Badge variant='destructive' className='gap-1'>
              <AlertTriangle className='w-3 h-3' />
              Due {dueSoonText}
            </Badge>
          ) : null}
          <Badge variant='outline'>
            {a.workMode === 'GROUP' ? 'Group work' : 'Individual'}
          </Badge>
          {a.gradingScope === 'GROUP' ? <Badge>Group grade</Badge> : null}
        </div>
      </div>
      {a.description ? (
        <p className='text-sm text-muted-foreground mb-2'>{a.description}</p>
      ) : null}
      <div className='flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground'>
        {openAt ? <span>Opens: {format(openAt, 'MMM d, yyyy h:mm a')}</span> : null}
        <span>Due: {format(due, 'MMM d, yyyy h:mm a')}</span>
        {hasExtension ? (
          <Badge
            variant='outline'
            className='text-[10px] gap-1 text-warning border-warning'
          >
            <CalendarClock className='w-3 h-3' />
            Extended from {format(baseDue, 'MMM d')}
          </Badge>
        ) : null}
        <AddToCalendarButton
          deadline={{
            kind: 'assignment',
            id: a.id,
            title: a.title,
            description: a.description,
            due,
            courseOfferingPublicId,
          }}
          className='text-xs text-muted-foreground'
        />
      </div>
    </>
  );
}
