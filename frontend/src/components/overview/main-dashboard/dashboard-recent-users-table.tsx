'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, MoreHorizontal } from 'lucide-react';
import type { User } from '@/lib/users/types';
import { SimpleDataTable } from '@/components/course-details/_shared/simple-data-table';
import { Avatar, AvatarFallback } from '@/features/ui/components/avatar';
import { Badge } from '@/features/ui/components/badge';
import { Button } from '@/features/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/ui/components/dropdown-menu';
import { roleBadgeVariant, TableEmpty, TableSkeleton, userInitials } from './dashboard-table-shared';

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
    id: 'actions',
    header: '',
    cell: () => (
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

export function DashboardRecentUsersTable({
  users,
  loading,
}: {
  users: User[];
  loading?: boolean;
}) {
  if (loading) return <TableSkeleton rows={5} />;
  if (!users.length) return <TableEmpty message='No users found.' />;

  return (
    <SimpleDataTable
      data={users as any}
      columns={userColumns as any}
      pageSize={5}
      hideToolbar
      embedded
      scrollContainerClassName='max-h-[320px]'
      mobilePrimaryColumn='name'
    />
  );
}
