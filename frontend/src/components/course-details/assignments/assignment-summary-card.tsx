'use client';

import { Download, Paperclip, X as XIcon } from 'lucide-react';
import { format } from 'date-fns';
import { attachmentDownloadUrl } from '@/lib/course-details/services/assignments-service';
import type { Assignment } from '@/lib/course-details/services/assignments-types';

export function AssignmentSummaryCard({
  assignment,
  onDeleteAttachment
}: {
  assignment: Assignment;
  onDeleteAttachment: (att: { id: number; name: string }) => void;
}) {
  return (
    <div className='rounded-xl border bg-card px-4 py-3 shadow-sm sm:px-6'>
      <h2 className='truncate text-lg font-semibold'>{assignment.title}</h2>
      <p className='mt-1 text-sm text-muted-foreground'>
        Due {format(new Date(assignment.due_date), 'MMM d, yyyy h:mm a')}
        {' · '}
        {assignment.workMode === 'GROUP' ? 'Group work' : 'Individual work'}
        {' · '}
        {assignment.gradingScope === 'GROUP' ? 'Group grade' : 'Individual grade'}
        {assignment.lateWindowMinutes > 0 &&
          ` · ${assignment.lateWindowMinutes}m late window`}
      </p>
      {assignment.attachments && assignment.attachments.length > 0 ? (
        <div className='mt-3 flex flex-wrap gap-2'>
          {assignment.attachments.map((att) => (
            <div
              key={att.id}
              className='flex items-center gap-2 rounded-md border px-2 py-1 text-xs'
            >
              <Paperclip className='h-3 w-3 text-muted-foreground' />
              <a href={att.url} target='_blank' rel='noreferrer' className='hover:underline'>
                {att.name}
              </a>
              <a
                href={attachmentDownloadUrl(att.id)}
                className='text-muted-foreground hover:text-foreground'
                title='Download'
              >
                <Download className='h-3 w-3' />
              </a>
              <button
                type='button'
                className='text-muted-foreground hover:text-destructive'
                onClick={() => onDeleteAttachment(att)}
                aria-label='Delete attachment'
              >
                <XIcon className='h-3 w-3' />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
