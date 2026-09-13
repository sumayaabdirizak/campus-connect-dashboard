'use client';

import { Button } from '@/features/ui/components/button';
import { Textarea } from '@/features/ui/components/textarea';

interface MessageEditFormProps {
  editValue: string;
  setEditValue: (v: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
}

export function MessageEditForm({
  editValue,
  setEditValue,
  textareaRef,
  onSave,
  onCancel,
  isPending
}: MessageEditFormProps) {
  return (
    <div className='w-full space-y-2 rounded-lg border bg-background p-2'>
      <Textarea
        ref={textareaRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        className='min-h-[60px] resize-none'
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSave();
          }
          if (e.key === 'Escape') onCancel();
        }}
      />
      <div className='flex items-center gap-2 text-xs'>
        <Button size='sm' onClick={onSave} disabled={isPending}>
          Save
        </Button>
        <Button size='sm' variant='ghost' onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
