'use client';

import { useDeanOfferings } from '@/features/dean/api/queries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { UserCheck } from 'lucide-react';

export function DeanOfferingsTab() {
  const { data, isLoading } = useDeanOfferings();
  const offerings = data?.offerings ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <UserCheck className='h-5 w-5' /> Course Offerings
        </CardTitle>
        <CardDescription>
          Academic courses active in sections for the current term.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className='text-muted-foreground py-8 text-center text-sm'>Loading...</p>
        ) : offerings.length === 0 ? (
          <div className='py-12 text-center'>
            <UserCheck className='text-muted-foreground mx-auto mb-2 h-10 w-10 opacity-20' />
            <p className='text-muted-foreground text-sm'>No course offerings found.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Section / Batch</TableHead>
                <TableHead>Term</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offerings.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <p className='font-medium'>{o.course.name}</p>
                    <p className='text-muted-foreground text-xs'>
                      {o.course.code} · {o.course.credits} Credits
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className='text-sm'>{o.section.name}</p>
                    <p className='text-muted-foreground text-xs'>
                      {o.section.batch.name} ({o.section.batch.program.name})
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant='outline'>{o.semester.name}</Badge>
                    <p className='text-muted-foreground mt-1 text-xs'>{o.academicYear.name}</p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
