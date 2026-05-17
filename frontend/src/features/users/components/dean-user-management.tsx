'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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

export default function DeanUserManagement() {
  const queryClient = useQueryClient();
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

  // Filtered Lists
  const filteredStudents =
    allStudents?.users.filter(
      (s: any) =>
        s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase())
    ) || [];

  const filteredLecturers =
    lecturers?.users.filter(
      (l: any) =>
        l.full_name.toLowerCase().includes(search.toLowerCase()) ||
        l.email.toLowerCase().includes(search.toLowerCase())
    ) || [];

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Manage Faculty Users</h1>
          <p className='text-muted-foreground'>
            Manage lecturers, students, and academic assignments.
          </p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline'>
            <Icons.download className='mr-2 h-4 w-4' /> Export
          </Button>
        </div>
      </div>

      <div className='flex items-center space-x-2'>
        <div className='relative flex-1 max-w-sm'>
          <Icons.search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
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
                <Icons.user className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{allStudents?.users.length || 0}</div>
              </CardContent>
            </Card>
            <Card className='border-amber-200 bg-amber-50/30'>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium text-amber-700'>Unassigned</CardTitle>
                <Icons.warning className='h-4 w-4 text-amber-600' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-amber-700'>
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
                  <table className='w-full text-sm'>
                    <thead className='bg-muted/50 border-b'>
                      <tr>
                        <th className='px-4 py-3 text-left'>Student</th>
                        <th className='px-4 py-3 text-left'>Batch</th>
                        <th className='px-4 py-3 text-left'>Section</th>
                        <th className='px-4 py-3 text-right'>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingStudents ? (
                        <tr>
                          <td colSpan={4} className='p-8 text-center animate-pulse'>
                            Loading...
                          </td>
                        </tr>
                      ) : (
                        filteredStudents
                          .filter((s: any) => s.isAssigned)
                          .map((s: any) => (
                            <tr key={s.id} className='border-b last:border-0'>
                              <td className='px-4 py-3'>
                                <div className='font-medium'>{s.full_name}</div>
                                <div className='text-xs text-muted-foreground'>{s.email}</div>
                              </td>
                              <td className='px-4 py-3'>
                                <Badge variant='secondary'>{s.batchName}</Badge>
                              </td>
                              <td className='px-4 py-3'>
                                <Badge variant='outline'>{s.sectionName}</Badge>
                              </td>
                              <td className='px-4 py-3 text-right'>
                                <Button variant='ghost' size='sm'>
                                  Details
                                </Button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
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
                    <div className='animate-pulse space-y-2'>
                      {[1, 2, 3].map((i) => (
                        <div key={i} className='h-12 bg-muted rounded' />
                      ))}
                    </div>
                  ) : (
                    unassignedStudents?.users.map((s: any) => (
                      <div
                        key={s.id}
                        className='flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors'
                      >
                        <div className='overflow-hidden'>
                          <div className='font-medium truncate'>{s.full_name}</div>
                          <div className='text-xs text-muted-foreground truncate'>{s.email}</div>
                        </div>
                        <AssignDialog student={s} />
                      </div>
                    ))
                  )}
                  {unassignedStudents?.users.length === 0 && (
                    <div className='text-center py-8 text-muted-foreground italic text-sm'>
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
                <table className='w-full text-sm'>
                  <thead className='bg-muted/50 border-b'>
                    <tr>
                      <th className='px-4 py-3 text-left'>Name</th>
                      <th className='px-4 py-3 text-left'>Email</th>
                      <th className='px-4 py-3 text-left'>Status</th>
                      <th className='px-4 py-3 text-right'>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingLecturers ? (
                      <tr>
                        <td colSpan={4} className='p-8 text-center animate-pulse'>
                          Loading...
                        </td>
                      </tr>
                    ) : (
                      filteredLecturers.map((l: any) => (
                        <tr key={l.id} className='border-b last:border-0 hover:bg-muted/30'>
                          <td className='px-4 py-3 font-medium'>{l.full_name}</td>
                          <td className='px-4 py-3 text-muted-foreground'>{l.email}</td>
                          <td className='px-4 py-3'>
                            <Badge
                              variant='outline'
                              className='text-green-600 border-green-200 bg-green-50'
                            >
                              {l.status}
                            </Badge>
                          </td>
                          <td className='px-4 py-3 text-right space-x-1'>
                            <Button variant='ghost' size='sm'>
                              Edit
                            </Button>
                            <Button variant='ghost' size='sm' className='text-red-500'>
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AssignDialog({ student }: { student: any }) {
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
    onError: (error: any) => {
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
                {batches?.batches.map((b: any) => (
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
                {sections?.sections.map((s: any) => (
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
