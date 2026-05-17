'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePrograms } from '../api/queries';

export function ProgramsTable() {
  const { data, isLoading } = usePrograms();
  const programs = data?.programs || [];

  if (isLoading) {
    return (
      <div className='flex h-48 w-full items-center justify-center rounded-xl border bg-background'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
      </div>
    );
  }

  return (
    <div className='rounded-xl border bg-background'>
      <table className='w-full text-sm'>
        <thead className='bg-muted/50 border-b'>
          <tr className='text-muted-foreground'>
            <th className='px-6 py-3 text-left font-medium'>Program Name</th>
            <th className='px-6 py-3 text-left font-medium'>Code</th>
            <th className='px-6 py-3 text-left font-medium'>Level</th>
            <th className='px-6 py-3 text-left font-medium'>Department</th>
            <th className='px-6 py-3 text-center font-medium'>Created</th>
            <th className='px-6 py-3 text-right font-medium'>Actions</th>
          </tr>
        </thead>
        <tbody>
          {programs.map((p) => (
            <tr key={p.id} className='border-b last:border-0 hover:bg-muted/40 transition'>
              <td className='px-6 py-4 font-medium'>{p.name}</td>
              <td className='px-6 py-4'>
                <Badge variant='outline'>{p.code}</Badge>
              </td>
              <td className='px-6 py-4'>
                <Badge variant='secondary'>{p.level}</Badge>
              </td>
              <td className='px-6 py-4 text-muted-foreground'>{p.department?.name}</td>
              <td className='px-6 py-4 text-center text-muted-foreground'>
                {new Date(p.created_at).toLocaleDateString()}
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
          {programs.length === 0 && (
            <tr>
              <td colSpan={6} className='text-center py-10 text-muted-foreground'>
                No academic programs found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
