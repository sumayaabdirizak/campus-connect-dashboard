'use client';

import { useState } from 'react';
import { useDeanBatches, useBatchSections } from '@/features/dean/api/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, BookOpen, Users, Layers } from 'lucide-react';
import PageContainer from '@/components/layout/page-container';
import { DeanBatch } from '@/features/dean/api/dean-api';

// ── Sections Panel (read-only) ──────────────────────────────────────────────
function SectionsPanel({ batch }: { batch: DeanBatch }) {
  const { data, isLoading } = useBatchSections(batch.id);
  const sections = data?.sections ?? [];

  return (
    <div className='border-t pt-3'>
      <p className='text-muted-foreground mb-2 text-sm font-medium'>Sections ({sections.length})</p>
      {isLoading ? (
        <p className='text-muted-foreground py-2 text-center text-xs'>Loading sections...</p>
      ) : sections.length === 0 ? (
        <p className='text-muted-foreground rounded-md border border-dashed py-4 text-center text-xs'>
          No sections in this batch.
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
                    · {section._count.studentRegistrations} students
                  </span>
                )}
              </div>
              {section._count?.courseOfferings ? (
                <Badge variant='secondary' className='text-[10px]'>
                  {section._count.courseOfferings} offerings
                </Badge>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Batch Row ──────────────────────────────────────────────────────────────
function BatchRow({ batch }: { batch: DeanBatch }) {
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
                  {batch.program.name} · {batch.academicYear.name} · Semester {batch.semester_number}
                </p>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <Badge variant='secondary'>
                {batch._count?.sections ?? batch.sections.length} sections
              </Badge>
              <Badge variant='outline' className='text-xs'>
                {batch.program.department.name}
              </Badge>
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

// ── Main Page ───────────────────────────────────────────────────────────────
export default function DeanBatchesPage() {
  const { data, isLoading, error } = useDeanBatches();
  const batches = data?.batches ?? [];
  const totalSections = batches.reduce((s, b) => s + (b._count?.sections ?? b.sections.length), 0);

  return (
    <PageContainer>
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Batches & Sections</h1>
          <p className='text-muted-foreground'>
            Overview of student batches and their sections in your faculty.
          </p>
        </div>

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
                <p className='text-2xl font-bold'>{totalSections}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {error ? (
          <div className='rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
            {error.message || 'Failed to load batches.'}
          </div>
        ) : null}

        {isLoading ? (
          <p className='text-muted-foreground py-12 text-center text-sm'>Loading batches...</p>
        ) : error ? null : batches.length === 0 ? (
          <Card>
            <CardContent className='py-16 text-center'>
              <BookOpen className='text-muted-foreground mx-auto mb-3 h-12 w-12' />
              <p className='font-medium'>No batches found</p>
              <p className='text-muted-foreground text-sm'>Batches are created by administration.</p>
            </CardContent>
          </Card>
        ) : (
          <div className='space-y-3'>
            {batches.map((batch) => (
              <BatchRow key={batch.id} batch={batch} />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
