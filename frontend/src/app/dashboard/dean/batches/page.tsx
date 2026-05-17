'use client';

import { useState } from 'react';
import {
  useDeanBatches,
  useCreateDeanBatch,
  useDeleteDeanBatch,
  useBatchSections,
  useCreateSection,
  useDeleteSection
} from '@/features/dean/api/queries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Trash2, ChevronDown, ChevronRight, BookOpen, Users, Layers } from 'lucide-react';
import PageContainer from '@/components/layout/page-container';
import { DeanBatch } from '@/features/dean/api/dean-api';

// ── Sections Panel ──────────────────────────────────────────────────────────
function SectionsPanel({ batch }: { batch: DeanBatch }) {
  const { data, isLoading } = useBatchSections(batch.id);
  const createSection = useCreateSection();
  const deleteSection = useDeleteSection();

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const sections = data?.sections ?? [];

  const handleAddSection = () => {
    if (!newName.trim()) return;
    createSection.mutate(
      { batchId: batch.id, name: newName },
      {
        onSuccess: () => {
          setNewName('');
          setAddOpen(false);
        }
      }
    );
  };

  return (
    <div className='border-t pt-3'>
      <div className='mb-2 flex items-center justify-between'>
        <p className='text-muted-foreground text-sm font-medium'>Sections ({sections.length})</p>
        <Button size='sm' variant='outline' onClick={() => setAddOpen(true)}>
          <Plus className='mr-1 h-3 w-3' /> Add Section
        </Button>
      </div>

      {isLoading ? (
        <p className='text-muted-foreground py-2 text-center text-xs'>Loading sections...</p>
      ) : sections.length === 0 ? (
        <p className='text-muted-foreground rounded-md border border-dashed py-4 text-center text-xs'>
          No sections yet. Add one to get started.
        </p>
      ) : (
        <div className='space-y-1'>
          {sections.map((section) => (
            <div
              key={section.id}
              className='bg-muted/40 flex items-center justify-between rounded-md px-3 py-2'
            >
              <div className='flex items-center gap-2'>
                <Layers className='text-muted-foreground h-3.5 w-3.5' />
                <span className='text-sm font-medium'>{section.name}</span>
                {section._count && (
                  <span className='text-muted-foreground text-xs'>
                    {section._count.studentRegistrations} students
                  </span>
                )}
              </div>
              <Button
                size='icon'
                variant='ghost'
                className='h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-600'
                onClick={() => setDeleteId(section.id)}
              >
                <Trash2 className='h-3.5 w-3.5' />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add Section Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className='sm:max-w-sm'>
          <DialogHeader>
            <DialogTitle>Add Section to {batch.name}</DialogTitle>
            <DialogDescription>
              Enter a name for the new section (e.g., Section A).
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-2 py-2'>
            <Label htmlFor='section-name'>Section Name</Label>
            <Input
              id='section-name'
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder='e.g. Section A'
              onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
            />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSection}
              disabled={createSection.isPending || !newName.trim()}
            >
              {createSection.isPending ? 'Creating...' : 'Create Section'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Section Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section?</AlertDialogTitle>
            <AlertDialogDescription>
              This section will be removed. This is blocked if students are registered in it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-red-600 hover:bg-red-700'
              onClick={() => {
                if (deleteId) deleteSection.mutate(deleteId);
                setDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Batch Row ──────────────────────────────────────────────────────────────
function BatchRow({ batch, onDelete }: { batch: DeanBatch; onDelete: (id: number) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className='rounded-lg border'>
        <CollapsibleTrigger asChild>
          <div className='flex cursor-pointer items-center justify-between p-4 hover:bg-muted/30'>
            <div className='flex items-center gap-3'>
              {open ? <ChevronDown className='h-4 w-4' /> : <ChevronRight className='h-4 w-4' />}
              <div>
                <p className='font-semibold'>{batch.name}</p>
                <p className='text-muted-foreground text-sm'>
                  {batch.program.name} · {batch.academicYear.name} · Semester{' '}
                  {batch.semester_number}
                </p>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <Badge variant='secondary'>
                {batch._count?.sections ?? batch.sections.length} sections
              </Badge>
              <Button
                size='icon'
                variant='ghost'
                className='h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600'
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(batch.id);
                }}
              >
                <Trash2 className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className='px-4 pb-4'>
            <SectionsPanel batch={batch} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ── Create Batch Dialog ─────────────────────────────────────────────────────
function CreateBatchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createBatch = useCreateDeanBatch();
  const [form, setForm] = useState({
    name: '',
    programId: '',
    academicYearId: '',
    semester_number: '1'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBatch.mutate(
      {
        name: form.name,
        programId: Number(form.programId),
        academicYearId: Number(form.academicYearId),
        semester_number: Number(form.semester_number)
      },
      {
        onSuccess: () => {
          onClose();
          setForm({ name: '', programId: '', academicYearId: '', semester_number: '1' });
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Create New Batch</DialogTitle>
          <DialogDescription>Add a new student batch to your faculty.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-4 py-2'>
          <div className='space-y-1.5'>
            <Label>Batch Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder='e.g. CS Batch 2025'
              required
            />
          </div>
          <div className='space-y-1.5'>
            <Label>Program ID</Label>
            <Input
              type='number'
              value={form.programId}
              onChange={(e) => setForm((f) => ({ ...f, programId: e.target.value }))}
              placeholder='Program ID'
              required
            />
          </div>
          <div className='space-y-1.5'>
            <Label>Academic Year ID</Label>
            <Input
              type='number'
              value={form.academicYearId}
              onChange={(e) => setForm((f) => ({ ...f, academicYearId: e.target.value }))}
              placeholder='Academic Year ID'
              required
            />
          </div>
          <div className='space-y-1.5'>
            <Label>Semester Number</Label>
            <Input
              type='number'
              min={1}
              max={8}
              value={form.semester_number}
              onChange={(e) => setForm((f) => ({ ...f, semester_number: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose}>
              Cancel
            </Button>
            <Button type='submit' disabled={createBatch.isPending}>
              {createBatch.isPending ? 'Creating...' : 'Create Batch'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function DeanBatchesPage() {
  const { data, isLoading } = useDeanBatches();
  const deleteBatch = useDeleteDeanBatch();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const batches = data?.batches ?? [];

  return (
    <PageContainer>
      <div className='space-y-6'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Batches & Sections</h1>
            <p className='text-muted-foreground'>
              Manage student batches and their sections in your faculty.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className='mr-2 h-4 w-4' /> New Batch
          </Button>
        </div>

        {/* Stats */}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <Card>
            <CardContent className='flex items-center gap-4 pt-6'>
              <div className='rounded-full bg-indigo-100 p-3'>
                <BookOpen className='h-5 w-5 text-indigo-600' />
              </div>
              <div>
                <p className='text-muted-foreground text-sm'>Total Batches</p>
                <p className='text-2xl font-bold'>{batches.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='flex items-center gap-4 pt-6'>
              <div className='rounded-full bg-teal-100 p-3'>
                <Users className='h-5 w-5 text-teal-600' />
              </div>
              <div>
                <p className='text-muted-foreground text-sm'>Total Sections</p>
                <p className='text-2xl font-bold'>
                  {batches.reduce((s, b) => s + (b._count?.sections ?? b.sections.length), 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Batches List */}
        {isLoading ? (
          <p className='text-muted-foreground py-12 text-center text-sm'>Loading batches...</p>
        ) : batches.length === 0 ? (
          <Card>
            <CardContent className='py-16 text-center'>
              <BookOpen className='text-muted-foreground mx-auto mb-3 h-12 w-12' />
              <p className='font-medium'>No batches yet</p>
              <p className='text-muted-foreground text-sm'>
                Create your first batch to get started.
              </p>
              <Button className='mt-4' onClick={() => setCreateOpen(true)}>
                <Plus className='mr-2 h-4 w-4' /> Create Batch
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className='space-y-3'>
            {batches.map((batch) => (
              <BatchRow key={batch.id} batch={batch} onDelete={setDeleteId} />
            ))}
          </div>
        )}
      </div>

      <CreateBatchDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Batch?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the batch and all its sections. This is blocked if students are
              enrolled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-red-600 hover:bg-red-700'
              onClick={() => {
                if (deleteId) deleteBatch.mutate(deleteId);
                setDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
