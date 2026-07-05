'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, MoreHorizontal } from 'lucide-react';
import type { PlatformAnalytics } from '@/features/admin/api/admin-api';
import type { User } from '@/features/users/api/types';
import { SimpleDataTable } from '@/features/course-details/components/_shared/simple-data-table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function userInitials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function roleBadgeVariant(role: string) {
  switch (role?.toUpperCase()) {
    case 'SUPER_ADMIN':
      return 'destructive';
    case 'DEAN':
      return 'default';
    case 'TEACHER':
      return 'secondary';
    default:
      return 'outline';
  }
}

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

const userColumns: ColumnDef<User>[] = [
  {
    id: 'name',
    header: 'Name',
    accessorFn: (row) => row.full_name,
    cell: ({ row }) => (
      <div className='flex items-center gap-2'>
        <Avatar className='size-8'>
          <AvatarFallback className='text-[10px]'>{userInitials(row.original.full_name)}</AvatarFallback>
        </Avatar>
        <span className='font-medium'>{row.original.full_name}</span>
      </div>
    ),
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => (
      <span className='text-muted-foreground max-w-[180px] truncate text-sm'>{row.original.email}</span>
    ),
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => (
      <Badge variant={roleBadgeVariant(row.original.role)} className='font-normal capitalize'>
        {row.original.role?.replace('_', ' ').toLowerCase()}
      </Badge>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant='outline' className='capitalize'>
        {row.original.status ?? 'active'}
      </Badge>
    ),
  },
  {
    id: 'joined',
    header: 'Joined Date',
    accessorFn: (row) => row.created_at,
    cell: ({ row }) =>
      row.original.created_at
        ? new Date(row.original.created_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : '—',
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon' className='size-8'>
            <MoreHorizontal className='size-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem asChild>
            <Link href='/dashboard/users'>
              <Eye className='mr-2 size-4' />
              View user
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    enableSorting: false,
  },
];

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
        <Link href='/dashboard/admin/report'>
          <Eye className='size-4' />
        </Link>
      </Button>
    ),
    enableSorting: false,
  },
];

export function DashboardRecentUsersTable({
  users,
  loading,
}: {
  users: User[];
  loading?: boolean;
}) {
  if (loading) {
    return <TableSkeleton rows={5} cols={6} />;
  }

  if (!users.length) {
    return <TableEmpty message='No users found.' />;
  }

  return (
    <SimpleDataTable
      data={users}
      columns={userColumns}
      pageSize={5}
      hideToolbar
      embedded
      scrollContainerClassName='max-h-[320px]'
      mobilePrimaryColumn='name'
    />
  );
}

export function DashboardRecentCoursesTable({
  data,
  loading,
}: {
  data?: PlatformAnalytics;
  loading?: boolean;
}) {
  const rows = useMemo(() => buildRecentCourses(data), [data]);

  if (loading) {
    return <TableSkeleton rows={5} cols={6} />;
  }

  if (!rows.length) {
    return <TableEmpty message='No courses with enrollment data yet.' />;
  }

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

function TableSkeleton({ rows, cols }: { rows: number; cols: number }) {
  return (
    <div className='space-y-2'>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className='h-11 w-full rounded-lg' />
      ))}
    </div>
  );
}

function TableEmpty({ message }: { message: string }) {
  return (
    <div className={cn('rounded-xl border border-dashed py-10 text-center')}>
      <p className='text-muted-foreground text-sm'>{message}</p>
    </div>
  );
}
