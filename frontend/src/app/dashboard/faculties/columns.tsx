'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export type Faculty = {
  id: number;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  established: string;
  description: string;
};

export const columns: ColumnDef<Faculty>[] = [
  {
    accessorKey: 'name',
    header: 'Faculty'
  },
  {
    accessorKey: 'code',
    header: 'Code',
    cell: ({ row }) => <Badge variant='secondary'>{row.getValue('code')}</Badge>
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return (
        <Badge
          variant='outline'
          className={
            status === 'active'
              ? 'text-green-600 border-green-200 bg-green-50'
              : 'text-gray-500 border-gray-200 bg-gray-50'
          }
        >
          {status}
        </Badge>
      );
    }
  },
  {
    accessorKey: 'established',
    header: 'Established'
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => <div className='max-w-[250px] truncate'>{row.getValue('description')}</div>
  },
  {
    id: 'actions',
    header: '',
    cell: () => (
      <div className='text-right space-x-2'>
        <Button variant='ghost' size='sm'>
          Edit
        </Button>
        <Button variant='ghost' size='sm' className='text-red-500'>
          Delete
        </Button>
      </div>
    )
  }
];
