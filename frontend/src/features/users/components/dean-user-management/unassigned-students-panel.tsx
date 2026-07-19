'use client';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AssignDialog } from './assign-dialog';
import type { DeanUserRow } from './types';

export function UnassignedStudentsPanel({
  students,
  isLoading,
}: {
  students: DeanUserRow[];
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          New Admissions
          <Badge variant='destructive'>{students.length}</Badge>
        </CardTitle>
        <CardDescription>
          Recently registered students needing assignment.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {isLoading ? (
            <div className='space-y-2'>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className='h-12 w-full' />
              ))}
            </div>
          ) : (
            students.map((s) => (
              <div
                key={s.id}
                className='hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3 transition-colors'
              >
                <div className='overflow-hidden'>
                  <div className='truncate font-medium'>{s.full_name}</div>
                  <div className='text-muted-foreground truncate text-xs'>{s.email}</div>
                </div>
                <AssignDialog student={s} />
              </div>
            ))
          )}
          {students.length === 0 && !isLoading ? (
            <div className='text-muted-foreground py-8 text-center text-sm italic'>
              All students are assigned.
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
