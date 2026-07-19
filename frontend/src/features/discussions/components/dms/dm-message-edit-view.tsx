'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export function DmMessageEditView({
  isAuthor,
  editValue,
  setEditValue,
  editTextareaRef,
  submitEdit,
  setIsEditing,
  isPending,
}: {
  isAuthor: boolean;
  editValue: string;
  setEditValue: (value: string) => void;
  editTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  submitEdit: () => void;
  setIsEditing: (value: boolean) => void;
  isPending: boolean;
}) {
  return (
    <div className={cn('flex px-4 py-0.5', isAuthor ? 'justify-end' : 'justify-start')}>
      <div className='w-full max-w-[75%] space-y-2 rounded-lg border bg-background p-2'>
        <Textarea
          ref={editTextareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className='min-h-[60px] resize-none'
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submitEdit();
            }
            if (e.key === 'Escape') setIsEditing(false);
          }}
        />
        <div className='flex items-center gap-2 text-xs'>
          <Button size='sm' onClick={submitEdit} disabled={isPending}>
            Save
          </Button>
          <Button size='sm' variant='ghost' onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
