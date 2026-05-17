'use client';

import { Button } from '@/components/ui/button';

export function BatchSectionsTable() {
  const sections = [
    {
      id: 1,
      name: 'Section A',
      batch: '2021 Intake',
      programLevel: 'Undergraduate',
      students: 40,
      createdAt: '2023-01-10'
    },
    {
      id: 2,
      name: 'Section B',
      batch: '2021 Intake',
      programLevel: 'Undergraduate',
      students: 35,
      createdAt: '2023-01-15'
    }
  ];

  return (
    <div className='rounded-xl border bg-white shadow-sm overflow-hidden'>
      <table className='w-full text-sm'>
        <thead className='bg-gray-50 border-b'>
          <tr className='text-gray-600'>
            <th className='px-6 py-3 text-left'>Section</th>
            <th className='px-6 py-3 text-left'>Batch</th>
            <th className='px-6 py-3 text-left'>Program Level</th>
            <th className='px-6 py-3 text-center'>Students</th>
            <th className='px-6 py-3 text-center'>Created</th>
            <th className='px-6 py-3 text-right'>Actions</th>
          </tr>
        </thead>

        <tbody>
          {sections.map((s) => (
            <tr key={s.id} className='border-b hover:bg-gray-50'>
              <td className='px-6 py-4 font-medium text-gray-900'>{s.name}</td>

              <td className='px-6 py-4 text-gray-600'>{s.batch}</td>

              <td className='px-6 py-4 text-gray-600'>{s.programLevel}</td>

              <td className='px-6 py-4 text-center'>{s.students}</td>

              <td className='px-6 py-4 text-center text-gray-500'>{s.createdAt}</td>

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
        </tbody>
      </table>
    </div>
  );
}
