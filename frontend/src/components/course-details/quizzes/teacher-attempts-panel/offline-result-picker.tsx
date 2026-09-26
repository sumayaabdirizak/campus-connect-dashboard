'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useCreateOfflineAttempt } from '@/lib/course-details/queries/quizzes-queries';

export function OfflineResultPicker({
  quizId,
  studentId,
  studentName,
  totalPoints,
  initialMarks,
  disabled
}: {
  quizId: number;
  studentId: number;
  studentName: string;
  totalPoints: number;
  /** Prefill when correcting an already-recorded score. */
  initialMarks?: number | null;
  disabled?: boolean;
}) {
  const [marks, setMarks] = useState('');
  const [selectKey, setSelectKey] = useState(0);
  const recordMutation = useCreateOfflineAttempt(quizId);
  const busy = disabled || recordMutation.isPending;
  const canSaveMarks = marks !== '' && !Number.isNaN(Number(marks));
  const marksCap = totalPoints > 0 ? totalPoints : 100;
  const isEdit = initialMarks != null;

  useEffect(() => {
    if (initialMarks != null && !Number.isNaN(initialMarks)) {
      setMarks(String(initialMarks));
    } else {
      setMarks('');
    }
  }, [initialMarks, studentId]);

  const recordMarks = () => {
    if (totalPoints <= 0) {
      toast.error('Set quiz marks on the quiz settings before recording scores');
      return;
    }
    const value = Math.min(Math.max(Number(marks) || 0, 0), totalPoints);
    recordMutation.mutate(
      { studentId, outcome: { marksEarned: value } },
      {
        onSuccess: () => {
          toast.success(
            isEdit
              ? `Updated to ${value}/${totalPoints} for ${studentName}`
              : `Recorded ${value}/${totalPoints} for ${studentName}`
          );
        },
        onError: (e: Error) => toast.error(e.message)
      }
    );
  };

  const recordAbsent = () => {
    if (
      !window.confirm(
        `Mark ${studentName} as Absent?\n\nThey did not take this quiz. No score will be saved.`
      )
    ) {
      setSelectKey((k) => k + 1);
      return;
    }
    recordMutation.mutate(
      { studentId, outcome: { absent: true } },
      {
        onSuccess: () => toast.success(`${studentName} marked Absent`),
        onError: (e: Error) => toast.error(e.message),
        onSettled: () => setSelectKey((k) => k + 1)
      }
    );
  };

  const recordCheat = () => {
    if (
      !window.confirm(
        `Mark ${studentName} for Cheating?\n\nTheir score will be saved as 0 / ${totalPoints || 'quiz total'}.`
      )
    ) {
      setSelectKey((k) => k + 1);
      return;
    }
    recordMutation.mutate(
      { studentId, outcome: { cheat: true } },
      {
        onSuccess: () => toast.success(`${studentName} marked Cheating (0 marks)`),
        onError: (e: Error) => toast.error(e.message),
        onSettled: () => setSelectKey((k) => k + 1)
      }
    );
  };

  const handleOutcomeSelect = (value: string) => {
    if (value === 'absent') recordAbsent();
    else if (value === 'cheat') recordCheat();
  };

  return (
    <div className='inline-flex flex-wrap items-center justify-end gap-2'>
      <Select
        key={selectKey}
        defaultValue='marks'
        onValueChange={handleOutcomeSelect}
        disabled={busy}
      >
        <SelectTrigger size='sm' className='w-[10.5rem] bg-card'>
          <SelectValue placeholder='Choose result…' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='marks'>Enter marks…</SelectItem>
          <SelectItem value='absent'>Absent</SelectItem>
          <SelectItem value='cheat'>Cheating (0 marks)</SelectItem>
        </SelectContent>
      </Select>

      <div className='flex items-center overflow-hidden rounded-lg border border-border bg-card shadow-sm'>
        <Input
          type='number'
          min={0}
          max={marksCap}
          placeholder='0'
          value={marks}
          onChange={(e) =>
            setMarks(String(Math.min(Math.max(Number(e.target.value) || 0, 0), marksCap)))
          }
          className='h-8 w-14 rounded-none border-0 bg-transparent text-center text-sm font-medium tabular-nums shadow-none focus-visible:ring-0'
          disabled={busy}
          aria-label={`Score for ${studentName}`}
        />
        <span className='shrink-0 border-l border-border bg-muted/50 px-2 text-xs font-medium text-muted-foreground tabular-nums'>
          / {totalPoints > 0 ? totalPoints : '—'}
        </span>
        <Button
          size='sm'
          className='h-8 rounded-none border-l border-primary/20'
          disabled={busy || !canSaveMarks || totalPoints <= 0}
          onClick={recordMarks}
          aria-label={`Save score for ${studentName}`}
        >
          {busy ? <Loader2 className='size-3.5 animate-spin' /> : null}
          {isEdit ? 'Update' : 'Save'}
        </Button>
      </div>

      {totalPoints <= 0 ? (
        <p className='text-xs text-warning-foreground'>Set quiz marks in quiz settings first.</p>
      ) : null}
    </div>
  );
}
