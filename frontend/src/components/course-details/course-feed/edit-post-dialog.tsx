'use client';

import { Button } from '@/features/ui/components/button';
import { Checkbox } from '@/features/ui/components/checkbox';
import { Input } from '@/features/ui/components/input';
import { Textarea } from '@/features/ui/components/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/features/ui/components/dialog';
import type { CoursePost } from '@/lib/course-details/types';

interface EditPostDialogProps {
  editing: CoursePost | null;
  setEditing: (post: CoursePost | null) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function EditPostDialog({
  editing,
  setEditing,
  onSave,
  isSaving
}: EditPostDialogProps) {
  return (
    <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>
        {editing ? (
          <div className='space-y-4 py-4'>
            <Input
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              placeholder='Title'
            />
            <Textarea
              value={editing.content}
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              rows={4}
            />
            <label className='flex items-center gap-2 text-sm'>
              <Checkbox
                checked={editing.isImportant}
                onCheckedChange={(v) =>
                  setEditing({ ...editing, isImportant: Boolean(v) })
                }
              />
              Mark as important
            </label>
            <label className='flex items-center gap-2 text-sm'>
              <Checkbox
                checked={editing.isPinned}
                onCheckedChange={(v) =>
                  setEditing({ ...editing, isPinned: Boolean(v) })
                }
              />
              Pin to top
            </label>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant='outline' onClick={() => setEditing(null)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
