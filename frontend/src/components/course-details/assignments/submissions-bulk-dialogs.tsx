'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import {
  handleExtensionDateChange,
  isPastExtensionDate,
  toDatetimeLocalMin
} from './extension-date-utils';

export function BulkGradeDialog({
  open,
  onOpenChange,
  selectedCount,
  maxMarks,
  gradeValue,
  setGradeValue,
  feedback,
  setFeedback,
  running,
  onApply
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  maxMarks: number;
  gradeValue: string;
  setGradeValue: (v: string) => void;
  feedback: string;
  setFeedback: (v: string) => void;
  running: boolean;
  onApply: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>Grade {selectedCount} submissions</DialogTitle>
        </DialogHeader>
        <div className='space-y-3 py-2'>
          <p className='text-xs text-muted-foreground'>
            Apply the same grade and feedback to every selected student. Leave grade
            blank to mark reviewed without a score.
          </p>
          <div className='space-y-1.5'>
            <Label className='text-xs'>Grade (0–{maxMarks})</Label>
            <Input
              type='number'
              min={0}
              max={maxMarks}
              value={gradeValue}
              onChange={(e) => setGradeValue(e.target.value)}
              placeholder={`e.g. ${Math.round(maxMarks * 0.85)}`}
            />
          </div>
          <div className='space-y-1.5'>
            <Label className='text-xs'>Feedback (optional)</Label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              placeholder='Comment shared with all selected students…'
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onApply} disabled={running}>
            {running ? (
              <>
                <Loader2 className='w-4 h-4 mr-1 animate-spin' />
                Grading…
              </>
            ) : (
              `Apply to ${selectedCount}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BulkExtendDialog({
  open,
  onOpenChange,
  selectedCount,
  date,
  setDate,
  reason,
  setReason,
  pending,
  onGrant
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  date: string;
  setDate: (v: string) => void;
  reason: string;
  setReason: (v: string) => void;
  pending: boolean;
  onGrant: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>Grant extension to {selectedCount} students</DialogTitle>
        </DialogHeader>
        <div className='space-y-3 py-2'>
          <p className='text-xs text-muted-foreground'>
            Sets a new due date for missing or ungraded students only.
          </p>
          <Input
            type='datetime-local'
            min={toDatetimeLocalMin()}
            value={date}
            onChange={(e) => handleExtensionDateChange(e.target.value, setDate)}
          />
          <Input
            placeholder='Reason (optional)'
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onGrant}
            disabled={pending || !date || isPastExtensionDate(date)}
          >
            {pending ? 'Granting…' : 'Grant'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { DeleteAttachmentDialog } from './delete-attachment-dialog';
