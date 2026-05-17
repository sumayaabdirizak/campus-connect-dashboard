'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@/lib/async-query';
import { facultiesQueryOptions } from '../api/queries';

export function FacultyTable() {
  const { data, isLoading, error } = useQuery(facultiesQueryOptions());

  if (isLoading)
    return (
      <div className='p-8 text-center text-muted-foreground animate-pulse'>
        Loading faculties...
      </div>
    );
  if (error)
    return (
      <div className='p-8 text-center text-red-500'>
        Error loading faculties: {(error as Error).message}
      </div>
    );

  const faculties =
    data && typeof data === 'object' && 'faculties' in data
      ? (data as any).faculties
      : Array.isArray(data)
        ? data
        : [];

  return (
    <div className='rounded-xl border bg-background'>
      {/* Table */}
      <table className='w-full text-sm'>
        {/* Header */}
        <thead className='bg-muted/50 border-b'>
          <tr className='text-muted-foreground'>
            <th className='px-6 py-3 text-left font-medium'>Faculty</th>
            <th className='px-6 py-3 text-left font-medium'>Code</th>
            <th className='px-6 py-3 text-center font-medium'>Status</th>
            <th className='px-6 py-3 text-center font-medium'>Created At</th>
            <th className='px-6 py-3 text-right font-medium'>Actions</th>
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {faculties.map((fac: any) => (
            <tr key={fac.id} className='border-b last:border-0 hover:bg-muted/40 transition'>
              <td className='px-6 py-4 font-medium text-foreground'>{fac.name}</td>

              <td className='px-6 py-4'>
                <Badge variant='secondary'>{fac.code}</Badge>
              </td>

              <td className='px-6 py-4 text-center'>
                <Badge
                  variant='outline'
                  className={
                    fac.status === 'ACTIVE' || fac.status === 'active'
                      ? 'text-green-600 border-green-200 bg-green-50'
                      : 'text-gray-500 border-gray-200 bg-gray-50'
                  }
                >
                  {fac.status || 'ACTIVE'}
                </Badge>
              </td>

              <td className='px-6 py-4 text-center text-muted-foreground'>
                {new Date(fac.created_at).toLocaleDateString()}
              </td>

              <td className='px-6 py-4 text-right space-x-2'>
                <Button variant='ghost' size='sm'>
                  Edit
                </Button>
                <Button variant='ghost' size='sm' className='text-red-500'>
                  Delete
                </Button>
              </td>
            </tr>
          ))}

          {/* Empty State */}
          {faculties.length === 0 && (
            <tr>
              <td colSpan={5} className='text-center py-10 text-muted-foreground'>
                No faculties found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Footer */}
      <div className='flex items-center justify-between px-6 py-4 text-sm text-muted-foreground'>
        <p>{faculties.length} total</p>
      </div>
    </div>
  );
}
