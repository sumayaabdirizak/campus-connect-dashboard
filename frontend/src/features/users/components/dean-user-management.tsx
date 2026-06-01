'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  fetchUsersByRole,
  assignStudentToSection,
  fetchBatches,
  fetchBatchSections
} from '../api/dean-service';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

/**
 * Dean-facing user management surface, rendered inside the shared
 * `PageContainer` at `app/dashboard/users/page.tsx` for users whose role
 * is DEAN. The page-level container already provides the page title and
 * sticky header, so this component MUST NOT render its own `<h1>` — doing
 * so produced the double-header bug flagged in the UI audit.
 *
 * All loading + table + status patterns route through the shared shadcn
 * primitives so dark mode + theme switching work without per-file fixes.
 */

/// Table-shaped skeleton for the row tables (Students + Lecturers).
/// We render N actual `<TableRow>` rows of `<Skeleton>` cells so the layout
/// doesn't shift when data lands — much nicer than the previous
/// "Loading..." colspan placeholder.
function TableLoadingRows({ rows = 4, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className='h-4 w-full max-w-[120px]' />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export default function DeanUserManagement() {
  const [activeTab, setActiveTab] = useState('students');
  const [search, setSearch] = useState('');

  // Queries
  const { data: lecturers, isLoading: loadingLecturers } = useQuery({
    queryKey: ['users', 'TEACHER'],
    queryFn: () => fetchUsersByRole('TEACHER')
  });

  const { data: allStudents, isLoading: loadingStudents } = useQuery({
    queryKey: ['users', 'STUDENT'],
    queryFn: () => fetchUsersByRole('STUDENT')
  });

  const { data: unassignedStudents, isLoading: loadingUnassigned } = useQuery({
    queryKey: ['users', 'STUDENT', 'unassigned'],
    queryFn: () => fetchUsersByRole('STUDENT', true)
  });

  // The dean service returns loosely-typed user rows that include extra
  // fields not on the canonical User type (isAssigned, batchName, sectionName,
  // status). We keep this row alias narrow to where it's actually used.
  type DeanUserRow = {
    id: number;
    full_name: string;
    email: string;
    isAssigned?: boolean;
    batchName?: string;
    sectionName?: string;
    status?: string;
  };

  // Filtered Lists
  const filteredStudents: DeanUserRow[] =
    ((allStudents?.users ?? []) as unknown as DeanUserRow[]).filter(
      (s) =>
        s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase())
    );

  const filteredLecturers: DeanUserRow[] =
    ((lecturers?.users ?? []) as unknown as DeanUserRow[]).filter(
      (l) =>
        l.full_name.toLowerCase().includes(search.toLowerCase()) ||
        l.email.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className='space-y-6'>
      {/* Header row — the actual page title is owned by PageContainer;
          this row is purely for the secondary "Export" action and the
          search input. Keeps a single source of truth for the header. */}
      <div className='flex items-start justify-between gap-2'>
        <p className='text-muted-foreground text-sm'>
          Manage lecturers, students, and academic assignments.
        </p>
        <Button variant='outline' size='sm'>
          <Icons.download className='mr-2 h-4 w-4' /> Export
        </Button>
      </div>

      <div className='flex items-center space-x-2'>
        <div className='relative max-w-sm flex-1'>
          <Icons.search className='text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4' />
          <Input
            placeholder='Search by name or email...'
            className='pl-8'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue='students' value={activeTab} onValueChange={setActiveTab}>
        <TabsList className='grid w-full max-w-[400px] grid-cols-2'>
          <TabsTrigger value='students'>Students</TabsTrigger>
          <TabsTrigger value='lecturers'>Lecturers</TabsTrigger>
        </TabsList>

        {/* STUDENTS TAB */}
        <TabsContent value='students' className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Total Students</CardTitle>
                <Icons.user className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{allStudents?.users.length || 0}</div>
              </CardContent>
            </Card>
            {/* "Unassigned" KPI card uses the warning token so it reads as
                an action-needed signal in both light and dark mode. */}
            <Card className='border-warning bg-warning-muted'>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-warning-foreground text-sm font-medium'>Unassigned</CardTitle>
                <Icons.warning className='text-warning h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-warning-foreground text-2xl font-bold'>
                  {unassignedStudents?.users.length || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className='grid gap-6 lg:grid-cols-3'>
            {/* Main Students List */}
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
                      {loadingStudents ? (
                        <TableLoadingRows rows={4} cols={4} />
                      ) : (
                        filteredStudents
                          .filter((s) => s.isAssigned)
                          .map((s) => (
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

            {/* Unassigned Students Sidebar */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  New Admissions
                  <Badge variant='destructive'>{unassignedStudents?.users.length || 0}</Badge>
                </CardTitle>
                <CardDescription>Recently registered students needing assignment.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  {loadingUnassigned ? (
                    <div className='space-y-2'>
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className='h-12 w-full' />
                      ))}
                    </div>
                  ) : (
                    unassignedStudents?.users.map((s: { id: number; full_name: string; email: string }) => (
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
                  {unassignedStudents?.users.length === 0 && !loadingUnassigned && (
                    <div className='text-muted-foreground py-8 text-center text-sm italic'>
                      All students are assigned.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* LECTURERS TAB */}
        <TabsContent value='lecturers'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between'>
              <div>
                <CardTitle>Faculty Lecturers</CardTitle>
                <CardDescription>Manage lecturers and their academic profiles.</CardDescription>
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
                    {loadingLecturers ? (
                      <TableLoadingRows rows={4} cols={4} />
                    ) : (
                      filteredLecturers.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className='font-medium'>{l.full_name}</TableCell>
                          <TableCell className='text-muted-foreground'>{l.email}</TableCell>
                          <TableCell>
                            {/* `success` Badge variant replaces the bespoke
                                `text-green-600 border-green-200 bg-green-50`
                                — dark mode + theme-safe via tokens. */}
                            <Badge variant='success'>{l.status}</Badge>
                          </TableCell>
                          <TableCell className='space-x-1 text-right'>
                            <Button variant='ghost' size='sm'>
                              Edit
                            </Button>
                            {/* `destructive` variant carries its own colour;
                                no need for the `text-red-500` className override. */}
                            <Button variant='ghost' size='sm' className='text-destructive hover:text-destructive'>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AssignDialog({ student }: { student: { id: number; full_name: string } }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [batchId, setBatchId] = useState<string>('');
  const [sectionId, setSectionId] = useState<string>('');

  const { data: batches } = useQuery({
    queryKey: ['batches'],
    queryFn: fetchBatches
  });

  const { data: sections } = useQuery({
    queryKey: ['sections', batchId],
    queryFn: () => fetchBatchSections(Number(batchId)),
    enabled: !!batchId
  });

  const assignMutation = useMutation({
    mutationFn: assignStudentToSection,
    onSuccess: () => {
      toast.success(`${student.full_name} assigned successfully!`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Assignment failed');
    }
  });

  const handleAssign = () => {
    if (!batchId || !sectionId) {
      toast.error('Please select both batch and section');
      return;
    }

    assignMutation.mutate({
      studentId: student.id,
      batchSectionId: Number(sectionId),
      registrationAcademicYearId: 1, // Example: should come from selected batch or global state
      currentAcademicYearId: 1,
      currentSemesterId: 1
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size='sm' variant='outline'>
          Assign
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Student to Batch</DialogTitle>
          <DialogDescription>
            Adding <strong>{student.full_name}</strong> to the academic structure.
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4 py-4'>
          <div className='space-y-2'>
            <label className='text-sm font-medium'>Academic Batch</label>
            <Select onValueChange={setBatchId} value={batchId}>
              <SelectTrigger>
                <SelectValue placeholder='Select a batch' />
              </SelectTrigger>
              <SelectContent>
                {batches?.batches.map((b: { id: number; name: string }) => (
                  <SelectItem key={b.id} value={b.id.toString()}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <label className='text-sm font-medium'>Batch Section</label>
            <Select onValueChange={setSectionId} value={sectionId} disabled={!batchId}>
              <SelectTrigger>
                <SelectValue placeholder='Select a section' />
              </SelectTrigger>
              <SelectContent>
                {sections?.sections.map((s: { id: number; name: string }) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={assignMutation.isPending}>
            {assignMutation.isPending ? 'Assigning...' : 'Confirm Assignment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
