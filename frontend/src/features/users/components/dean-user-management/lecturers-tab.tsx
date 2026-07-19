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
import { Icons } from '@/components/icons';
import type { DeanUserRow } from './types';
import { TableLoadingRows } from './table-loading-rows';

export function LecturersTab({
  lecturers,
  isLoading,
}: {
  lecturers: DeanUserRow[];
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <div>
          <CardTitle>Faculty Lecturers</CardTitle>
          <CardDescription>
            Manage lecturers and their academic profiles.
          </CardDescription>
        </div>
        <Button>
          <Icons.add className='mr-2 h-4 w-4' /> Add Lecturer
        </Button>
      </CardHeader>
      <CardContent>
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableLoadingRows rows={4} cols={4} />
              ) : (
                lecturers.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className='font-medium'>{l.full_name}</TableCell>
                    <TableCell className='text-muted-foreground'>{l.email}</TableCell>
                    <TableCell>
                      <Badge variant='success'>{l.status}</Badge>
                    </TableCell>
                    <TableCell className='space-x-1 text-right'>
                      <Button variant='ghost' size='sm'>
                        Edit
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='text-destructive hover:text-destructive'
                      >
                        Delete
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
