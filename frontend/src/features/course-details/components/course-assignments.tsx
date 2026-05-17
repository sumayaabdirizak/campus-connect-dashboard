'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Search,
  Plus,
  Eye,
  Download,
  ArrowLeft,
  Calendar,
  Clock,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface CourseAssignmentsProps {
  courseId: string;
  isStudent?: boolean;
}

const assignments = [
  {
    id: 'a1',
    title: 'Functional Dependencies & Normalization',
    dueDate: new Date(Date.now() + 86400000 * 3),
    submissionsCount: 12,
    missingCount: 3,
    status: 'published',
    instructions:
      'Design a normalized database schema based on the provided business requirements.',
    allowLate: false,
    maxGrade: 100
  },
  {
    id: 'a2',
    title: 'SQL Complex Queries',
    dueDate: new Date(Date.now() - 86400000 * 2),
    submissionsCount: 28,
    missingCount: 4,
    status: 'published',
    instructions: 'Write SQL queries for the university database.',
    allowLate: true,
    maxGrade: 50
  }
];

const submissions = [
  {
    id: 's1',
    studentName: 'Ahmed Ali',
    studentId: '20210001',
    submittedAt: new Date(),
    status: 'submitted',
    grade: 95,
    feedback: 'Excellent work!'
  },
  {
    id: 's2',
    studentName: 'Sara Smith',
    studentId: '20210005',
    submittedAt: new Date(Date.now() - 3600000),
    status: 'late',
    grade: null,
    feedback: ''
  },
  {
    id: 's3',
    studentName: 'John Doe',
    studentId: '20210010',
    submittedAt: null,
    status: 'missing',
    grade: null,
    feedback: ''
  }
];

export function CourseAssignments({ courseId, isStudent }: CourseAssignmentsProps) {
  const [view, setView] = useState('list');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [allowLate, setAllowLate] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = assignments.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = () => {
    toast.success('Assignment created');
    setCreateOpen(false);
    setNewTitle('');
    setNewInstructions('');
    setNewDueDate('');
  };

  const openSubmissions = (assignment: any) => {
    setSelectedAssignment(assignment);
    setView('submissions');
  };

  const openGrading = (submission: any) => {
    setSelectedSubmission(submission);
    setGrade(submission.grade?.toString() || '');
    setFeedback(submission.feedback || '');
    setDrawerOpen(true);
  };

  const handleSaveGrade = () => {
    toast.success('Grade saved');
    setDrawerOpen(false);
  };

  if (isStudent) {
    return (
      <div className='space-y-4'>
        {assignments.map((a) => (
          <div key={a.id} className='border rounded-lg p-4'>
            <div className='flex items-center justify-between mb-2'>
              <span className='font-medium'>{a.title}</span>
              <Badge variant={a.status === 'published' ? 'default' : 'secondary'}>{a.status}</Badge>
            </div>
            <p className='text-sm text-muted-foreground mb-2'>{a.instructions}</p>
            <p className='text-xs text-muted-foreground'>
              Due: {format(a.dueDate, 'MMM d, yyyy h:mm a')}
            </p>
          </div>
        ))}
      </div>
    );
  }

  if (view === 'submissions') {
    const filteredSubs = submissions.filter((s) => {
      if (filter === 'all') return true;
      return s.status === filter;
    });

    return (
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <Button variant='ghost' onClick={() => setView('list')} className='gap-1'>
            <ArrowLeft className='w-4 h-4' /> Back
          </Button>
          <Button variant='outline' className='gap-1'>
            <Download className='w-4 h-4' /> Download All
          </Button>
        </div>

        <div className='mb-4'>
          <h2 className='text-xl font-bold'>{selectedAssignment?.title}</h2>
          <p className='text-sm text-muted-foreground'>
            Due: {selectedAssignment && format(selectedAssignment.dueDate, 'MMMM d, yyyy h:mm a')}
          </p>
        </div>

        <div className='flex gap-2 mb-4'>
          {['all', 'submitted', 'late', 'missing'].map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size='sm'
              onClick={() => setFilter(f)}
            >
              {f} (
              {f === 'all' ? submissions.length : submissions.filter((s) => s.status === f).length})
            </Button>
          ))}
        </div>

        <div className='border rounded-lg overflow-hidden'>
          <Table>
            <TableHeader className='bg-muted/30'>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubs.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className='font-medium'>{sub.studentName}</TableCell>
                  <TableCell>{sub.studentId}</TableCell>
                  <TableCell>
                    {sub.submittedAt ? format(sub.submittedAt, 'MMM d, h:mm a') : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        sub.status === 'submitted'
                          ? 'default'
                          : sub.status === 'late'
                            ? 'outline'
                            : 'secondary'
                      }
                    >
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{sub.grade !== null ? `${sub.grade}%` : '-'}</TableCell>
                  <TableCell>
                    {sub.status !== 'missing' && (
                      <Button variant='ghost' size='sm' onClick={() => openGrading(sub)}>
                        Grade
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent className='w-full sm:max-w-lg'>
            <SheetHeader>
              <SheetTitle>Grade Submission</SheetTitle>
            </SheetHeader>
            {selectedSubmission && (
              <div className='space-y-4 py-4'>
                <div className='p-3 bg-muted/30 rounded'>
                  <p className='font-medium'>{selectedSubmission.studentName}</p>
                  <p className='text-sm text-muted-foreground'>{selectedSubmission.studentId}</p>
                </div>
                <div className='space-y-2'>
                  <Label>Grade (0-100)</Label>
                  <Input type='number' value={grade} onChange={(e) => setGrade(e.target.value)} />
                </div>
                <div className='space-y-2'>
                  <Label>Feedback</Label>
                  <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button onClick={handleSaveGrade} className='w-full'>
                  Save Grade
                </Button>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='flex gap-2'>
        <div className='relative flex-1 max-w-xs'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
          <Input
            placeholder='Search...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='pl-10'
          />
        </div>
        <Button onClick={() => setCreateOpen(true)} className='gap-1'>
          <Plus className='w-4 h-4' /> Create Assignment
        </Button>
      </div>

      <div className='border rounded-lg overflow-hidden'>
        <Table>
          <TableHeader className='bg-muted/30'>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Submissions</TableHead>
              <TableHead>Missing</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => (
              <TableRow key={a.id}>
                <TableCell className='font-medium'>{a.title}</TableCell>
                <TableCell>{format(a.dueDate, 'MMM d, h:mm a')}</TableCell>
                <TableCell className='text-emerald-600'>{a.submissionsCount}</TableCell>
                <TableCell className='text-rose-600'>{a.missingCount}</TableCell>
                <TableCell>
                  <Badge variant={a.status === 'published' ? 'default' : 'secondary'}>
                    {a.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant='ghost' size='sm' onClick={() => openSubmissions(a)}>
                    <Eye className='w-4 h-4 mr-1' /> View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>Create Assignment</DialogTitle>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label>Title *</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder='e.g. Assignment 1'
              />
            </div>
            <div className='space-y-2'>
              <Label>Instructions</Label>
              <Textarea
                value={newInstructions}
                onChange={(e) => setNewInstructions(e.target.value)}
                placeholder='Instructions...'
                rows={4}
              />
            </div>
            <div className='space-y-2'>
              <Label>Due Date *</Label>
              <Input
                type='datetime-local'
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </div>
            <div className='flex items-center gap-2'>
              <Switch checked={allowLate} onCheckedChange={setAllowLate} />
              <Label>Allow late submissions</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
