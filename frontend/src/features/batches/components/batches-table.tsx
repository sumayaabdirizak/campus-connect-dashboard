'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function BatchesTable() {
  const batches = [
    {
      id: 1,
      name: 'CS 2025',
      academic_year: '2025-2026',
      status: 'active',
      program: {
        name: 'BSc Computer Science',
        code: 'CS',
        level: 'undergraduate',
        department: {
          name: 'Computer Science'
        }
      }
    },
    {
      id: 2,
      name: 'MBA 2025',
      academic_year: '2025-2026',
      status: 'active',
      program: {
        name: 'MBA',
        code: 'MBA',
        level: 'postgraduate',
        department: {
          name: 'Business'
        }
      }
    }
  ];

  return (
    <div className='rounded-xl border bg-background'>
      <table className='w-full text-sm'>
        {/* Header */}
        <thead className='bg-muted/50 border-b'>
          <tr className='text-muted-foreground'>
            <th className='px-6 py-3 text-left font-medium'>Batch</th>
            <th className='px-6 py-3 text-left font-medium'>Program</th>
            <th className='px-6 py-3 text-left font-medium'>Department</th>
            <th className='px-6 py-3 text-center font-medium'>Level</th>
            <th className='px-6 py-3 text-center font-medium'>Academic Year</th>
            <th className='px-6 py-3 text-center font-medium'>Status</th>
            <th className='px-6 py-3 text-right font-medium'>Actions</th>
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {batches.map((b) => (
            <tr key={b.id} className='border-b last:border-0 hover:bg-muted/40 transition'>
              {/* Batch */}
              <td className='px-6 py-4 font-medium'>{b.name}</td>

              {/* Program */}
              <td className='px-6 py-4'>
                <div className='font-medium'>{b.program.name}</div>
                <div className='text-xs text-muted-foreground'>{b.program.code}</div>
              </td>

              {/* Department */}
              <td className='px-6 py-4 text-muted-foreground'>{b.program.department.name}</td>

              {/* Level */}
              <td className='px-6 py-4 text-center'>
                <Badge variant='secondary'>{b.program.level}</Badge>
              </td>

              {/* Academic Year */}
              <td className='px-6 py-4 text-center'>{b.academic_year}</td>

              {/* Status */}
              <td className='px-6 py-4 text-center'>
                <Badge
                  variant='outline'
                  className={
                    b.status === 'active'
                      ? 'text-green-600 border-green-200 bg-green-50'
                      : 'text-gray-500 border-gray-200 bg-gray-50'
                  }
                >
                  {b.status}
                </Badge>
              </td>

              {/* Actions */}
              <td className='px-6 py-4 text-right space-x-2'>
                <Button variant='ghost' size='sm'>
                  View
                </Button>
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
          {batches.length === 0 && (
            <tr>
              <td colSpan={7} className='text-center py-10 text-muted-foreground'>
                No batches found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
