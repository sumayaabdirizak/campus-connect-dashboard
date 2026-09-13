'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useManualGradeAssignment } from '@/lib/course-details/queries/assignments-queries';
import { useCreateOfflineAttempt } from '@/lib/course-details/queries/quizzes-queries';
import { isGradeInputAllowed } from '../assignments/grade-input-utils';

export type GradebookEditTarget =
  | {
      kind: 'assignment';
      assignmentId: number;
      title: string;
      maxMarks: number;
      studentId: number;
      studentName: string;
      currentGrade: number | null;
    }
  | {
      kind: 'offline_quiz';
      quizId: number;
      title: string;
      maxMarks: number;
      studentId: number;
      studentName: string;
      currentEarned: number | null;
    };

interface GradebookEditDialogProps {
  target: GradebookEditTarget | null;
  onClose: () => void;
}

export function GradebookEditDialog({ target, onClose }: GradebookEditDialogProps) {
  const [marks, setMarks] = useState('');
  const assignmentMutation = useManualGradeAssignment();
  const offlineMutation = useCreateOfflineAttempt(target?.kind === 'offline_quiz' ? target.quizId : 0);
  const pending = assignmentMutation.isPending || offlineMutation.isPending;
  const open = target != null;
  const maxMarks = target?.maxMarks ?? 0;
  const isUpdate =
    target?.kind === 'assignment'
      ? target.currentGrade != null
      : target?.kind === 'offline_quiz'
        ? target.currentEarned != null
        : false;

  useEffect(() => {
    if (!target) {
      setMarks('');
      return;
    }
    const current =
      target.kind === 'assignment' ? target.currentGrade : target.currentEarned;
    setMarks(current != null ? String(current) : '');
  }, [target]);

  const canSave =
    marks !== '' &&
    !Number.isNaN(Number(marks)) &&
    maxMarks > 0 &&
    Number(marks) >= 0 &&
    Number(marks) <= maxMarks;

  const handleSave = () => {
    if (!target || !canSave) return;
    const value = Math.min(Math.max(Number(marks) || 0, 0), maxMarks);

    if (target.kind === 'assignment') {
      assignmentMutation.mutate(
        {
          assignmentId: target.assignmentId,
          input: { studentId: target.studentId, grade: value }
        },
        {
          onSuccess: () => {
            toast.success(
              isUpdate
                ? `Updated ${target.studentName} to ${value}/${maxMarks}`
                : `Saved ${value}/${maxMarks} for ${target.studentName}`
            );
            onClose();
          },
          onError: (e: Error) => toast.error(e.message)
        }
      );
      return;
    }

    offlineMutation.mutate(
      { studentId: target.studentId, outcome: { marksEarned: value } },
      {
        onSuccess: () => {
          toast.success(
            isUpdate
              ? `Updated ${target.studentName} to ${value}/${maxMarks}`
              : `Saved ${value}/${maxMarks} for ${target.studentName}`
          );
          onClose();
        },
        onError: (e: Error) => toast.error(e.message)
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className='max-w-sm'>
        <DialogHeader>
          <DialogTitle>{isUpdate ? 'Edit grade' : 'Enter grade'}</DialogTitle>
        </DialogHeader>
        {target ? (
          <div className='space-y-3 py-1'>
            <div>
              <p className='text-sm font-medium text-foreground'>{target.studentName}</p>
              <p className='text-xs text-muted-foreground'>{target.title}</p>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='gradebook-marks'>Marks</Label>
              <div className='flex items-center gap-2'>
                <Input
                  id='gradebook-marks'
                  type='number'
                  min={0}
                  max={maxMarks}
                  value={marks}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (isGradeInputAllowed(next, maxMarks)) setMarks(next);
                  }}
                  className='h-9 w-24 tabular-nums'
                  autoFocus
                  disabled={pending || maxMarks <= 0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canSave && !pending) handleSave();
                  }}
                />
                <span className='text-sm text-muted-foreground tabular-nums'>
                  / {maxMarks > 0 ? maxMarks : '—'}
                </span>
              </div>
              {maxMarks <= 0 ? (
                <p className='text-xs text-warning-foreground'>
                  Set marks on this item before grading.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant='outline' onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={pending || !canSave}>
            {pending ? <Loader2 className='size-3.5 animate-spin' /> : null}
            {isUpdate ? 'Update' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
