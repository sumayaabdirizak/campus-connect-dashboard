'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/components/tabs';
import {
  PosTable,
  PosTableBody,
  PosTableCell,
  PosTableHead,
  PosTableHeaderCell,
  PosTableRow
} from '@/features/pos/components/pos-table';
import { useBatchOverview } from '@/lib/batches-admin/queries';

export function BatchOverviewSheet({
  batchId,
  batchName,
  open,
  onOpenChange
}: {
  batchId: number | null;
  batchName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const id = batchId ?? 0;
  const { data, isLoading, error } = useBatchOverview(id, open && id > 0);
  const students = data?.students ?? [];
  const courses = data?.courses ?? [];
  const title = data?.batch?.name ?? batchName ?? 'Batch';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='right'
        className='flex w-full flex-col gap-0 overflow-hidden sm:max-w-xl'
      >
        <SheetHeader className='border-b border-border pb-4'>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            Students registered in this batch and its course offerings.
          </SheetDescription>
        </SheetHeader>

        <div className='flex min-h-0 flex-1 flex-col overflow-hidden pt-4'>
          {isLoading ? (
            <div className='flex flex-1 items-center justify-center'>
              <div className='size-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
            </div>
          ) : error ? (
            <p className='px-1 text-sm text-destructive'>
              Failed to load: {(error as Error).message}
            </p>
          ) : (
            <Tabs defaultValue='students' className='flex min-h-0 flex-1 flex-col gap-3'>
              <TabsList className='h-10 w-full justify-start rounded-full bg-muted/80 p-1'>
                <TabsTrigger value='students' className='rounded-full px-4'>
                  Students ({students.length})
                </TabsTrigger>
                <TabsTrigger value='courses' className='rounded-full px-4'>
                  Courses ({courses.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value='students' className='mt-0 min-h-0 flex-1 overflow-y-auto'>
                {students.length === 0 ? (
                  <p className='rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground'>
                    No students in this batch yet.
                  </p>
                ) : (
                  <div className='overflow-x-auto rounded-xl border'>
                    <PosTable>
                      <PosTableHead>
                        <tr>
                          <PosTableHeaderCell>Name</PosTableHeaderCell>
                          <PosTableHeaderCell>Number</PosTableHeaderCell>
                          <PosTableHeaderCell>Section</PosTableHeaderCell>
                        </tr>
                      </PosTableHead>
                      <PosTableBody>
                        {students.map((s) => (
                          <PosTableRow key={s.id}>
                            <PosTableCell className='font-medium'>{s.full_name}</PosTableCell>
                            <PosTableCell>{s.number ?? '—'}</PosTableCell>
                            <PosTableCell>{s.sectionName ?? '—'}</PosTableCell>
                          </PosTableRow>
                        ))}
                      </PosTableBody>
                    </PosTable>
                  </div>
                )}
              </TabsContent>

              <TabsContent value='courses' className='mt-0 min-h-0 flex-1 overflow-y-auto'>
                {courses.length === 0 ? (
                  <p className='rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground'>
                    No course offerings for this batch yet.
                  </p>
                ) : (
                  <div className='overflow-x-auto rounded-xl border'>
                    <PosTable>
                      <PosTableHead>
                        <tr>
                          <PosTableHeaderCell>Code</PosTableHeaderCell>
                          <PosTableHeaderCell>Name</PosTableHeaderCell>
                          <PosTableHeaderCell>Teacher</PosTableHeaderCell>
                          <PosTableHeaderCell>Section</PosTableHeaderCell>
                        </tr>
                      </PosTableHead>
                      <PosTableBody>
                        {courses.map((c) => (
                          <PosTableRow key={c.offeringId}>
                            <PosTableCell className='font-medium'>{c.code}</PosTableCell>
                            <PosTableCell>{c.name}</PosTableCell>
                            <PosTableCell>{c.teacherName ?? '—'}</PosTableCell>
                            <PosTableCell>{c.sectionName}</PosTableCell>
                          </PosTableRow>
                        ))}
                      </PosTableBody>
                    </PosTable>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
