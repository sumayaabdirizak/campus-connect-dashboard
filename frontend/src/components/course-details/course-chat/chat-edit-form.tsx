'use client';

import { Button } from '@/features/ui/components/button';
import { Textarea } from '@/features/ui/components/textarea';

interface ChatEditFormProps {
  editDraft: string;
  setEditDraft: (v: string) => void;
  editPending: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export function ChatEditForm({
  editDraft,
  setEditDraft,
  editPending,
  onCancel,
  onSave
}: ChatEditFormProps) {
  return (
    <div className='min-w-[260px] space-y-2'>
      <Textarea
        value={editDraft}
        onChange={(event) => setEditDraft(event.target.value)}
        className='min-h-20 resize-none text-sm'
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel();
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSave();
          }
        }}
      />
      <div className='flex justify-end gap-2'>
        <Button type='button' size='sm' variant='ghost' onClick={onCancel}>
          Cancel
        </Button>
        <Button type='button' size='sm' onClick={onSave} disabled={editPending}>
          Save
        </Button>
      </div>
    </div>
  );
}
