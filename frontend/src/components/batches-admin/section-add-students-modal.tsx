'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/features/ui/components/button';
import { Checkbox } from '@/features/ui/components/checkbox';
import { Input } from '@/features/ui/components/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/features/ui/components/dialog';
import { useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import { handleApiError, showToast } from '@/lib/notifications';
import { fetchUsers } from '@/components/users/api/service';
import {
  addSectionStudents,
  fetchSectionStudents,
  type BatchSection
} from '@/lib/batches-admin/services';
import { adminBatchSectionsQueryKey } from '@/lib/batches-admin/queries';

type Props = {
  section: BatchSection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SectionAddStudentsModal({ section, open, onOpenChange }: Props) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const queryClient = useQueryClient();

  const enrolledQuery = useQuery({
    queryKey: ['section-students', section.id],
    queryFn: () => fetchSectionStudents(section.id),
    enabled: open
  });

  const studentsQuery = useQuery({
    queryKey: ['users', 'STUDENT', 'section-pick'],
    queryFn: () => fetchUsers(),
    enabled: open
  });

  const enrolledIds = useMemo(
    () => new Set((enrolledQuery.data?.students ?? []).map((s) => s.id)),
    [enrolledQuery.data]
  );

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (studentsQuery.data?.users ?? []).filter((u: any) => {
      if (enrolledIds.has(u.id)) return false;
      if (!q) return true;
      return [u.full_name, u.email, u.number].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [studentsQuery.data, enrolledIds, search]);

  const addMutation = useMutation({
    mutationFn: () => addSectionStudents(section.id, selected),
    onSuccess: (data) => {
      showToast('success', data.message);
      setSelected([]);
      void queryClient.invalidateQueries({ queryKey: ['section-students', section.id] });
      void queryClient.invalidateQueries({ queryKey: adminBatchSectionsQueryKey });
      onOpenChange(false);
    },
    onError: (error: unknown) => handleApiError(error, 'Failed to add students')
  });

  const toggle = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSelected([]);
        onOpenChange(next);
      }}
    >
      <DialogContent className='flex max-h-[min(90dvh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg'>
        <DialogHeader className='border-b px-5 py-4'>
          <DialogTitle>Add students — {section.name}</DialogTitle>
        </DialogHeader>

        <div className='space-y-3 px-5 py-4'>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search students...'
          />
          <div className='max-h-[360px] space-y-1 overflow-y-auto rounded-lg border p-2'>
            {studentsQuery.isLoading || enrolledQuery.isLoading ? (
              <p className='p-4 text-center text-sm text-muted-foreground'>Loading…</p>
            ) : candidates.length === 0 ? (
              <p className='p-4 text-center text-sm text-muted-foreground'>
                No available students to add.
              </p>
            ) : (
              candidates.map((student: any) => (
                <label
                  key={student.id}
                  className='flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/60'
                >
                  <Checkbox
                    checked={selected.includes(student.id)}
                    onCheckedChange={() => toggle(student.id)}
                  />
                  <span className='min-w-0 flex-1'>
                    <span className='block truncate text-sm font-medium text-foreground'>
                      {student.full_name}
                    </span>
                    <span className='block truncate text-xs text-muted-foreground'>
                      {student.email}
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
          {enrolledIds.size > 0 ? (
            <p className='text-xs text-muted-foreground'>
              {enrolledIds.size} student(s) already in this section.
            </p>
          ) : null}
        </div>

        <DialogFooter className='border-t px-5 py-3'>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type='button'
            disabled={selected.length === 0 || addMutation.isPending}
            onClick={() => addMutation.mutate()}
          >
            {addMutation.isPending
              ? 'Adding…'
              : selected.length > 0
                ? `Add ${selected.length}`
                : 'Add students'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
