'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDepartments } from '../api/queries';

export function DepartmentTable() {
  const { data, isLoading } = useDepartments();
  const departments = data?.departments || [];

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
            <th className='px-6 py-3 text-left font-medium'>Department</th>
            <th className='px-6 py-3 text-left font-medium'>Code</th>
            <th className='px-6 py-3 text-left font-medium'>Faculty</th>
            <th className='px-6 py-3 text-center font-medium'>Levels</th>
            <th className='px-6 py-3 text-center font-medium'>Created</th>
            <th className='px-6 py-3 text-right font-medium'>Actions</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((dept) => (
            <tr key={dept.id} className='border-b last:border-0 hover:bg-muted/40 transition'>
              <td className='px-6 py-4 font-medium'>{dept.name}</td>
              <td className='px-6 py-4'>
                <Badge variant='secondary'>{dept.code}</Badge>
              </td>
              <td className='px-6 py-4 text-muted-foreground'>{dept.faculty?.name}</td>
              <td className='px-6 py-4 text-center'>
                <div className='flex flex-wrap gap-1 justify-center'>
                  {dept.levels?.map((lvl) => (
                    <Badge key={lvl.id} variant='outline' className='text-[10px] uppercase'>
                      {lvl.level}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className='px-6 py-4 text-center text-muted-foreground'>
                {dept.created_at ? new Date(dept.created_at).toLocaleDateString() : 'N/A'}
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
          {departments.length === 0 && (
            <tr>
              <td colSpan={6} className='text-center py-10 text-muted-foreground'>
                No departments found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
