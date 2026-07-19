'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { DeanUserRow } from './types';
import { TableLoadingRows } from './table-loading-rows';

export function AssignedStudentsTable({
  students,
  isLoading,
}: {
  students: DeanUserRow[];
  isLoading: boolean;
}) {
  const assigned = students.filter((s) => s.isAssigned);

  return (
    <Card className='lg:col-span-2'>
      <CardHeader>
        <CardTitle>Assigned Students</CardTitle>
        <CardDescription>
          Students currently registered in a batch and section.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Section</TableHead>
                <TableHead className='text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableLoadingRows rows={4} cols={4} />
              ) : (
                assigned.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className='font-medium'>{s.full_name}</div>
                      <div className='text-muted-foreground text-xs'>{s.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant='secondary'>{s.batchName}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant='outline'>{s.sectionName}</Badge>
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button variant='ghost' size='sm'>
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
