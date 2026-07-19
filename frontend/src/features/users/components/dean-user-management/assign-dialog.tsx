'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
            <label htmlFor='assign-batch' className='text-sm font-medium'>
              Academic Batch
            </label>
            <Select onValueChange={setBatchId} value={batchId}>
              <SelectTrigger id='assign-batch'>
                <SelectValue placeholder='Select a batch' />
              </SelectTrigger>
              <SelectContent>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id.toString()}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-2'>
            <label htmlFor='assign-section' className='text-sm font-medium'>
              Batch Section
            </label>
            <Select
              onValueChange={setSectionId}
              value={sectionId}
              disabled={!batchId}
            >
              <SelectTrigger id='assign-section'>
                <SelectValue placeholder='Select a section' />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
