'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import PageContainer from '@/features/layout/components/page-container';
import { PosPageHeader } from '@/features/pos/components/pos-page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/components/tabs';
import {
  PosTable,
  PosTableBody,
  PosTableCell,
  PosTableHead,
  PosTableHeaderCell,
  PosTableRow
} from '@/features/pos/components/pos-table';
import { PosTableCard } from '@/features/pos/components/pos-table-card';
import { Button } from '@/features/ui/components/button';
import { useBatchOverview } from '@/lib/batches-admin/queries';
import { academicScopeHref } from '@/lib/academic-scope/scope-href';
import { useAuthStore } from '@/lib/auth-store';

export function BatchOverviewPage({ batchId }: { batchId: number }) {
  const [tab, setTab] = useState<'students' | 'courses'>('students');
  const role = useAuthStore((state) => state.user?.role);
  const { data, isLoading, error, refetch, isFetching } = useBatchOverview(batchId);
  const batch = data?.batch;
  const students = data?.students ?? [];
  const courses = data?.courses ?? [];

  const scope = useMemo(() => {
    const facultyId = batch?.program?.department?.faculty?.id;
    const departmentId = batch?.program?.department?.id;
    const programId = batch?.program?.id ?? batch?.programId;
    return { facultyId, departmentId, programId };
  }, [batch]);

  const backHref = useMemo(
    () => academicScopeHref('/dashboard/batches', scope),
    [scope]
  );

  const coursesHref = useMemo(
    () =>
      role === 'DEAN'
        ? '/dashboard/dean/courses'
        : academicScopeHref('/dashboard/courses', scope),
    [role, scope]
  );

  return (
    <PageContainer scrollable={false}>
      <div className='mb-3 flex flex-wrap items-center gap-2'>
        <Button asChild variant='ghost' size='sm' className='-ml-2 h-8 gap-1.5 text-muted-foreground'>
          <Link href={backHref}>
            <ArrowLeft className='size-3.5' />
            Back to batches
          </Link>
        </Button>
        <span className='text-xs text-muted-foreground'>·</span>
        <Button asChild variant='ghost' size='sm' className='h-8 text-muted-foreground'>
          <Link href={coursesHref}>
            {role === 'DEAN' ? 'Assign courses' : 'Course catalogue'}
          </Link>
        </Button>
      </div>

      <PosPageHeader
        title={batch?.name ?? 'Batch'}
        onRefresh={() => void refetch()}
        refreshing={isFetching}
      />
      {batch?.program ? (
        <p className='mb-3 text-sm text-muted-foreground'>
          {batch.program.code}
          {batch.program.department?.name ? ` · ${batch.program.department.name}` : ''}
          {batch.academicYear?.name ? ` · ${batch.academicYear.name}` : ''}
          <span className='mt-1 block text-xs'>
            Last step: course offerings on sections (Dean: Assign to batch).
          </span>
        </p>
      ) : null}

      {isLoading ? (
        <div className='flex h-48 items-center justify-center rounded-xl border bg-card'>
          <div className='size-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
        </div>
      ) : error ? (
        <div className='rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-destructive'>
          Failed to load batch: {(error as Error).message}
        </div>
      ) : (
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as 'students' | 'courses')}
          className='gap-3'
        >
          <TabsList className='h-10 w-full max-w-full justify-start overflow-x-auto rounded-full bg-muted/80 p-1 sm:w-auto'>
            <TabsTrigger value='students' className='rounded-full px-4'>
              Students ({students.length})
            </TabsTrigger>
            <TabsTrigger value='courses' className='rounded-full px-4'>
              Offerings ({courses.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value='students' className='mt-0'>
            <PosTableCard>
              {students.length === 0 ? (
                <div className='p-10 text-center text-sm text-muted-foreground'>
                  No students registered in this batch yet.
                </div>
              ) : (
                <PosTable>
                  <PosTableHead>
                    <tr>
                      <PosTableHeaderCell>Name</PosTableHeaderCell>
                      <PosTableHeaderCell>Number</PosTableHeaderCell>
                      <PosTableHeaderCell>Email</PosTableHeaderCell>
                      <PosTableHeaderCell>Section</PosTableHeaderCell>
                    </tr>
                  </PosTableHead>
                  <PosTableBody>
                    {students.map((s) => (
                      <PosTableRow key={s.id}>
                        <PosTableCell className='font-medium'>{s.full_name}</PosTableCell>
                        <PosTableCell>{s.number ?? '—'}</PosTableCell>
                        <PosTableCell>{s.email}</PosTableCell>
                        <PosTableCell>{s.sectionName ?? '—'}</PosTableCell>
                      </PosTableRow>
                    ))}
                  </PosTableBody>
                </PosTable>
              )}
            </PosTableCard>
          </TabsContent>

          <TabsContent value='courses' className='mt-0'>
            <PosTableCard>
              {courses.length === 0 ? (
                <div className='p-10 text-center'>
                  <p className='text-sm text-muted-foreground'>
                    No course offerings for this batch yet.
                  </p>
                  {role === 'DEAN' ? (
                    <Button asChild className='mt-4' size='sm'>
                      <Link href='/dashboard/dean/courses'>Assign course to batch</Link>
                    </Button>
                  ) : (
                    <p className='mt-2 text-xs text-muted-foreground'>
                      Ask a Dean to assign catalogue courses to a section (Teacher → Batch →
                      Section → Year → Semester).
                    </p>
                  )}
                </div>
              ) : (
                <PosTable>
                  <PosTableHead>
                    <tr>
                      <PosTableHeaderCell>Code</PosTableHeaderCell>
                      <PosTableHeaderCell>Name</PosTableHeaderCell>
                      <PosTableHeaderCell>Credits</PosTableHeaderCell>
                      <PosTableHeaderCell>Teacher</PosTableHeaderCell>
                      <PosTableHeaderCell>Section</PosTableHeaderCell>
                      <PosTableHeaderCell>Term</PosTableHeaderCell>
                    </tr>
                  </PosTableHead>
                  <PosTableBody>
                    {courses.map((c) => (
                      <PosTableRow key={c.offeringId}>
                        <PosTableCell className='font-medium'>{c.code}</PosTableCell>
                        <PosTableCell>{c.name}</PosTableCell>
                        <PosTableCell>{c.credits}</PosTableCell>
                        <PosTableCell>{c.teacherName ?? '—'}</PosTableCell>
                        <PosTableCell>{c.sectionName}</PosTableCell>
                        <PosTableCell>
                          {[c.academicYearName, c.semesterName].filter(Boolean).join(' · ') ||
                            '—'}
                        </PosTableCell>
                      </PosTableRow>
                    ))}
                  </PosTableBody>
                </PosTable>
              )}
            </PosTableCard>
          </TabsContent>
        </Tabs>
      )}
    </PageContainer>
  );
}
