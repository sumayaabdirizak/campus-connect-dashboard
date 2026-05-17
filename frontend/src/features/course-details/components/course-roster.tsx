'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Download, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

interface CourseRosterProps {
  courseId: string;
}

const students = [
  { id: 1, name: 'Ahmed Ali', email: 'ahmed@campus.edu', number: '20210001', status: 'ACTIVE' },
  { id: 2, name: 'Sara Smith', email: 'sara@campus.edu', number: '20210005', status: 'ACTIVE' },
  { id: 3, name: 'John Doe', email: 'john@campus.edu', number: '20210010', status: 'ACTIVE' },
  { id: 4, name: 'Ali Khan', email: 'ali@campus.edu', number: '20210015', status: 'ACTIVE' },
  { id: 5, name: 'Fatima', email: 'fatima@campus.edu', number: '20210020', status: 'INACTIVE' }
];

export function CourseRoster({ courseId }: CourseRosterProps) {
  const [search, setSearch] = useState('');

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.number.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = () => {
    const csv = [
      ['ID', 'Name', 'Email', 'Number', 'Status'],
      ...students.map((s) => [s.id, s.name, s.email, s.number, s.status])
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roster-${courseId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Roster exported');
  };

  return (
    <div className='space-y-4'>
      <div className='flex gap-2'>
        <Input
          placeholder='Search students...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='max-w-xs'
        />
        <Button onClick={handleExport} variant='outline' className='gap-1'>
          <Download className='w-4 h-4' /> Export CSV
        </Button>
      </div>

      <div className='border rounded-lg overflow-hidden'>
        <Table>
          <TableHeader className='bg-muted/30'>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Student ID</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className='font-medium'>{s.name}</TableCell>
                <TableCell className='text-muted-foreground'>{s.email}</TableCell>
                <TableCell className='text-muted-foreground'>{s.number}</TableCell>
                <TableCell>
                  <Badge variant={s.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {s.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
