'use client';

import { useState } from 'react';
import { useDeanTeachers } from '@/features/dean/api/queries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { GraduationCap, Search } from 'lucide-react';

export function DeanTeachersTab() {
  const { data, isLoading } = useDeanTeachers();
  const [search, setSearch] = useState('');

  const teachers = (data?.teachers ?? []).filter(
    (t) =>
      !search ||
      t.full_name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <GraduationCap className='h-5 w-5' /> Faculty Teachers
        </CardTitle>
        <CardDescription>All lecturers affiliated with your faculty.</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='relative'>
          <Search className='text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2' />
          <Input
            placeholder='Search teachers...'
            className='pl-9'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isLoading ? (
          <p className='text-muted-foreground py-8 text-center text-sm'>Loading...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead>Assignments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className='py-8 text-center text-muted-foreground'>
                    No teachers found.
                  </TableCell>
                </TableRow>
              ) : (
                teachers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className='font-medium'>{t.full_name}</TableCell>
                    <TableCell className='text-muted-foreground text-sm'>{t.email}</TableCell>
                    <TableCell>
                      {t.lecturerProfile?.specialty ? (
                        <Badge variant='outline'>{t.lecturerProfile.specialty}</Badge>
                      ) : (
                        <span className='text-muted-foreground text-sm'>General</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={(t as { totalAssignments?: number }).totalAssignments ? 'default' : 'secondary'}>
                        {(t as { totalAssignments?: number }).totalAssignments ?? 0}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
