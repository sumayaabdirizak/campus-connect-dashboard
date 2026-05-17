'use client';

import { useState } from 'react';
import {
  useDeanTeachers,
  useDeanOfferings,
  useCreateOffering,
  useDeleteOffering,
  useDeanCourses,
  useAssignTeacherToCourse,
  useUnassignedTeachers,
  useUnassignedSections
} from '@/features/dean/api/queries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Plus, Trash2, Users, UserCheck, AlertTriangle, Search, GraduationCap } from 'lucide-react';
import PageContainer from '@/components/layout/page-container';

// ── Create Offering Dialog ──────────────────────────────────────────────────
function CreateOfferingDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: coursesData } = useDeanCourses();
  const createOffering = useCreateOffering();

  const [form, setForm] = useState({
    courseId: '',
    sectionId: '',
    semesterId: '',
    academicYearId: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createOffering.mutate(
      {
        courseId: Number(form.courseId),
        sectionId: Number(form.sectionId),
        semesterId: Number(form.semesterId),
        academicYearId: Number(form.academicYearId)
      },
      {
        onSuccess: () => {
          onClose();
          setForm({ courseId: '', sectionId: '', semesterId: '', academicYearId: '' });
        }
      }
    );
  };

  const courses = coursesData?.courses ?? [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Offer Course to Section</DialogTitle>
          <DialogDescription>Assign a course to a specific section for a term.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-4 py-2'>
          <div className='space-y-1.5'>
            <Label>Course</Label>
            <Select
              value={form.courseId}
              onValueChange={(v) => setForm((f) => ({ ...f, courseId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder='Select course...' />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.code}: {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-1.5'>
              <Label>Section ID</Label>
              <Input
                type='number'
                value={form.sectionId}
                onChange={(e) => setForm((f) => ({ ...f, sectionId: e.target.value }))}
                placeholder='e.g. 5'
                required
              />
            </div>
            <div className='space-y-1.5'>
              <Label>Semester ID</Label>
              <Input
                type='number'
                value={form.semesterId}
                onChange={(e) => setForm((f) => ({ ...f, semesterId: e.target.value }))}
                placeholder='e.g. 1'
                required
              />
            </div>
          </div>
          <div className='space-y-1.5'>
            <Label>Academic Year ID</Label>
            <Input
              type='number'
              value={form.academicYearId}
              onChange={(e) => setForm((f) => ({ ...f, academicYearId: e.target.value }))}
              placeholder='e.g. 2'
              required
            />
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose}>
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={createOffering.isPending || !form.courseId || !form.sectionId}
            >
              {createOffering.isPending ? 'Creating...' : 'Offer Course'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Offerings Table ─────────────────────────────────────────────────────────
function OfferingsTab({ onAdd }: { onAdd: () => void }) {
  const { data, isLoading } = useDeanOfferings();
  const deleteOffering = useDeleteOffering();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const offerings = data?.offerings ?? [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <UserCheck className='h-5 w-5' /> Course Offerings
              </CardTitle>
              <CardDescription>
                Academic courses active in specific sections for the current term.
              </CardDescription>
            </div>
            <Button onClick={onAdd}>
              <Plus className='mr-2 h-4 w-4' /> Add Offering
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className='text-muted-foreground py-8 text-center text-sm'>Loading...</p>
          ) : offerings.length === 0 ? (
            <div className='py-12 text-center'>
              <UserCheck className='text-muted-foreground mx-auto mb-2 h-10 w-10' />
              <p className='text-muted-foreground text-sm'>No course offerings yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Section/Batch</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead className='w-12' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {offerings.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <div>
                        <p className='font-medium'>{o.course.name}</p>
                        <p className='text-muted-foreground text-xs'>
                          {o.course.code} · {o.course.credits} Credits
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className='text-sm'>{o.section.name}</p>
                        <p className='text-muted-foreground text-xs'>
                          {o.section.batch.name} ({o.section.batch.program.name})
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant='outline'>{o.semester.name}</Badge>
                      <p className='text-muted-foreground mt-1 text-xs'>{o.academicYear.name}</p>
                    </TableCell>
                    <TableCell>
                      <Button
                        size='icon'
                        variant='ghost'
                        className='h-8 w-8 text-red-500 hover:bg-red-50'
                        onClick={() => setDeleteId(o.id)}
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Offering?</AlertDialogTitle>
            <AlertDialogDescription>
              Students in this section will no longer see this course in their curriculum for this
              term.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-red-600 hover:bg-red-700'
              onClick={() => {
                if (deleteId) deleteOffering.mutate(deleteId);
                setDeleteId(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Teachers Overview Tab ───────────────────────────────────────────────────
function TeachersTab() {
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
                <TableHead>Assignings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((t) => (
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
                    <Badge variant={(t as any).totalAssignments > 0 ? 'default' : 'secondary'}>
                      {(t as any).totalAssignments ?? 0} assigning(s)
                    </Badge>
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

// ── Gaps Tab (Unassigned) ───────────────────────────────────────────────────
function GapsTab() {
  const { data: unassignedTeachers } = useUnassignedTeachers();
  const { data: unassignedSections } = useUnassignedSections();

  const teachers = unassignedTeachers?.teachers ?? [];
  const sections = unassignedSections?.sections ?? [];

  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <AlertTriangle className='h-4 w-4 text-amber-500' />
            Unassigned Teachers ({teachers.length})
          </CardTitle>
          <CardDescription>Teachers with no current assigning.</CardDescription>
        </CardHeader>
        <CardContent>
          {teachers.length === 0 ? (
            <p className='text-muted-foreground py-6 text-center text-sm'>
              All teachers are assigned ✓
            </p>
          ) : (
            <div className='space-y-2'>
              {teachers.map((t) => (
                <div
                  key={t.id}
                  className='flex items-center justify-between rounded-md border px-3 py-2'
                >
                  <div>
                    <p className='text-sm font-medium'>{t.full_name}</p>
                    <p className='text-muted-foreground text-xs'>
                      {t.lecturerProfile?.specialty ?? 'General'}
                    </p>
                  </div>
                  <Badge variant='secondary'>Unassigned</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <AlertTriangle className='h-4 w-4 text-red-500' />
            Sections Without Teacher ({sections.length})
          </CardTitle>
          <CardDescription>Sections that have no teacher assigned yet.</CardDescription>
        </CardHeader>
        <CardContent>
          {sections.length === 0 ? (
            <p className='text-muted-foreground py-6 text-center text-sm'>
              All sections have teachers ✓
            </p>
          ) : (
            <div className='space-y-2'>
              {sections.map((s: any) => (
                <div
                  key={s.id}
                  className='flex items-center justify-between rounded-md border px-3 py-2'
                >
                  <div>
                    <p className='text-sm font-medium'>{s.name}</p>
                    <p className='text-muted-foreground text-xs'>
                      {s.batch?.name} · {s.batch?.program?.name}
                    </p>
                  </div>
                  <Badge variant='destructive'>No Teacher</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function DeanAssignmentsPage() {
  const [assignOpen, setAssignOpen] = useState(false);
  const { data: offeringsData } = useDeanOfferings();
  const { data: teachersData } = useDeanTeachers();

  return (
    <PageContainer>
      <div className='space-y-6'>
        {/* Header */}
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Academic Offerings</h1>
          <p className='text-muted-foreground'>
            Activate courses for specific sections, semesters, and academic years.
          </p>
        </div>

        {/* Stats */}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
          <Card>
            <CardContent className='flex items-center gap-4 pt-6'>
              <div className='rounded-full bg-purple-100 p-3'>
                <Users className='h-5 w-5 text-purple-600' />
              </div>
              <div>
                <p className='text-muted-foreground text-sm'>Faculty Teachers</p>
                <p className='text-2xl font-bold'>{teachersData?.teachers?.length ?? '—'}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='flex items-center gap-4 pt-6'>
              <div className='rounded-full bg-green-100 p-3'>
                <GraduationCap className='h-5 w-5 text-green-600' />
              </div>
              <div>
                <p className='text-muted-foreground text-sm'>Active Offerings</p>
                <p className='text-2xl font-bold'>{offeringsData?.offerings?.length ?? '—'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue='offerings'>
          <TabsList>
            <TabsTrigger value='offerings'>Offerings</TabsTrigger>
            <TabsTrigger value='teachers'>Teachers</TabsTrigger>
          </TabsList>
          <TabsContent value='offerings' className='mt-4'>
            <OfferingsTab onAdd={() => setAssignOpen(true)} />
          </TabsContent>
          <TabsContent value='teachers' className='mt-4'>
            <TeachersTab />
          </TabsContent>
        </Tabs>
      </div>

      <CreateOfferingDialog open={assignOpen} onClose={() => setAssignOpen(false)} />
    </PageContainer>
  );
}
