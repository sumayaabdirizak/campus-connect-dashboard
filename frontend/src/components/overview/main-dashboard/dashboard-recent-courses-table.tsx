'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye } from 'lucide-react';
import type { PlatformAnalytics } from '@/lib/admin';
import { SimpleDataTable } from '@/components/course-details/_shared/simple-data-table';
import { Badge } from '@/features/ui/components/badge';
import { Button } from '@/features/ui/components/button';
import { TableEmpty, TableSkeleton } from './dashboard-table-shared';

export interface RecentCourseRow {
  id: string;
  course: string;
  name: string;
  instructor: string;
  students: number;
  status: string;
  progress: number;
}

export function buildRecentCourses(data?: PlatformAnalytics): RecentCourseRow[] {
  return (data?.charts.coursePerformance ?? []).slice(0, 8).map((c) => {
    const total = c.enrollments || 1;
    const progress = Math.round((c.completions / total) * 100);
    return {
      id: c.course,
      course: c.course,
      name: c.name,
      instructor: '—',
      students: c.enrollments,
      status: c.enrollments > 0 ? 'Active' : 'Draft',
      progress: Number.isFinite(progress) ? progress : 0,
    };
  });
}

const courseColumns: ColumnDef<RecentCourseRow>[] = [
  {
    id: 'course',
    header: 'Course',
    accessorFn: (row) => row.course,
    cell: ({ row }) => (
      <div>
        <p className='font-medium'>{row.original.course}</p>
        <p className='text-muted-foreground truncate text-xs'>{row.original.name}</p>
      </div>
    ),
  },
  { accessorKey: 'instructor', header: 'Instructor' },
  {
    accessorKey: 'students',
    header: 'Students',
    cell: ({ row }) => row.original.students.toLocaleString(),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.status === 'Active' ? 'secondary' : 'outline'}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'progress',
    header: 'Progress',
    cell: ({ row }) => (
      <div className='flex min-w-[88px] items-center gap-2'>
        <div className='bg-muted h-1.5 flex-1 overflow-hidden rounded-full'>
          <div
            className='bg-primary h-full rounded-full transition-all'
            style={{ width: `${row.original.progress}%` }}
          />
        </div>
        <span className='text-muted-foreground text-xs tabular-nums'>{row.original.progress}%</span>
      </div>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: () => (
      <Button variant='ghost' size='icon' className='size-8' asChild>
        <Link href='/dashboard/reports/course-reports'>
          <Eye className='size-4' />
        </Link>
      </Button>
    ),
    enableSorting: false,
  },
];

export function DashboardRecentCoursesTable({
  data,
  loading,
}: {
  data?: PlatformAnalytics;
  loading?: boolean;
}) {
  const rows = useMemo(() => buildRecentCourses(data), [data]);

  if (loading) return <TableSkeleton rows={5} />;
  if (!rows.length) return <TableEmpty message='No courses with enrollment data yet.' />;

  return (
    <SimpleDataTable
      data={rows}
      columns={courseColumns}
      pageSize={5}
      hideToolbar
      embedded
      scrollContainerClassName='max-h-[320px]'
      mobilePrimaryColumn='course'
    />
  );
}
