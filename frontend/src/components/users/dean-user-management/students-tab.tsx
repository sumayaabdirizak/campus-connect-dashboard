'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/features/ui/components/card';
import { Icons } from '@/components/icons';
import { AssignedStudentsTable } from './assigned-students-table';
import { UnassignedStudentsPanel } from './unassigned-students-panel';
import type { DeanUserRow } from './types';

export function StudentsTab({
  filteredStudents,
  unassignedStudents,
  totalCount,
  unassignedCount,
  loadingStudents,
  loadingUnassigned,
}: {
  filteredStudents: DeanUserRow[];
  unassignedStudents: DeanUserRow[];
  totalCount: number;
  unassignedCount: number;
  loadingStudents: boolean;
  loadingUnassigned: boolean;
}) {
  return (
    <div className='space-y-4'>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Students</CardTitle>
            <Icons.user className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{totalCount}</div>
          </CardContent>
        </Card>
        <Card className='border-warning bg-warning-muted'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-warning-foreground text-sm font-medium'>
              Unassigned
            </CardTitle>
            <Icons.warning className='text-warning h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-warning-foreground text-2xl font-bold'>
              {unassignedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className='grid gap-6 lg:grid-cols-3'>
        <AssignedStudentsTable
          students={filteredStudents}
          isLoading={loadingStudents}
        />
        <UnassignedStudentsPanel
          students={unassignedStudents}
          isLoading={loadingUnassigned}
        />
      </div>
    </div>
  );
}
