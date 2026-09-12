'use client';

import { useMemo } from 'react';
import { Button } from '@/features/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/features/ui/components/dialog';
import { SearchSelect } from '@/features/ui/components/search-select';
import { useAssignStudent } from './use-assign-student';

export function AssignDialog({
  student,
}: {
  student: { id: number; full_name: string };
}) {
  const {
    open,
    setOpen,
    batchId,
    setBatchId,
    sectionId,
    setSectionId,
    batches,
    sections,
    handleAssign,
    isPending,
  } = useAssignStudent(student);

  const batchOptions = useMemo(
    () => batches.map((b) => ({ value: b.id.toString(), label: b.name })),
    [batches]
  );
  const sectionOptions = useMemo(
    () => sections.map((s) => ({ value: s.id.toString(), label: s.name })),
    [sections]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size='sm' variant='outline'>
          Assign
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Student to Batch</DialogTitle>
          <DialogDescription>
            Adding <strong>{student.full_name}</strong> to the academic structure.
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4 py-4'>
          <div className='space-y-2'>
            <label className='text-sm font-medium'>Academic Batch</label>
            <SearchSelect
              options={batchOptions}
              value={batchId}
              onValueChange={(v) => {
                setBatchId(v);
                setSectionId('');
              }}
              placeholder='Select a batch'
              searchPlaceholder='Search batches...'
              emptyText='No batches found.'
            />
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium'>Batch Section</label>
            <SearchSelect
              options={sectionOptions}
              value={sectionId}
              onValueChange={setSectionId}
              disabled={!batchId}
              placeholder={batchId ? 'Select a section' : 'Pick a batch first'}
              searchPlaceholder='Search sections...'
              emptyText='No sections found.'
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={isPending}>
            {isPending ? 'Assigning...' : 'Confirm Assignment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
