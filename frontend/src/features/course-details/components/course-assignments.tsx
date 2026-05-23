'use client';

import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Search,
  Plus,
  Eye,
  Download,
  ArrowLeft,
  CalendarClock,
  CalendarPlus,
  Trash2,
  Paperclip,
  X as XIcon,
  ClipboardCheck,
  Sparkles,
  Loader2
} from 'lucide-react';
import { EmptyState } from './_shared/empty-state';
import { ListSkeleton } from './_shared/list-skeleton';
import { useDeleteWithUndo } from './_shared/use-delete-with-undo';
import { useQueryClient } from '@/lib/async-query';
import { deleteAssignment as deleteAssignmentCall } from '../api/assignments-service';
import { assignmentKeys } from '../api/assignments-queries';
import { CreateAssignmentForm, type AssignmentFormValues } from './create-assignment-form';
import { StudentContextRail } from './_shared/student-context-rail';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { PdfViewer, isPdfUrl } from './pdf-viewer';
import {
  assignmentIcsUrl,
  attachmentDownloadUrl,
  courseAssignmentsIcsUrl
} from '../api/assignments-service';
import {
  useAssignments,
  useCreateAssignment,
  useDeleteAssignment,
  useDeleteAttachment,
  useExtensions,
  useGradeSubmission,
  useGrantExtension,
  useGrantExtensionBatch,
  useSubmissions,
  useSubmitWork,
  useSuggestGradeWithAi,
  useUploadAttachments
} from '../api/assignments-queries';
import type {
  Assignment,
  AssignmentGradingScope,
  AssignmentWorkMode,
  Submission,
  SubmissionExtension
} from '../api/assignments-types';

interface CourseAssignmentsProps {
  courseId: string;
  isStudent?: boolean;
}

type Outcome = 'grade' | 'extend' | 'missing';

/**
 * Effective due date for a given submission = max(Assignment.due_date, any
 * matching extension's newDueAt). Status badges (submitted / late / missing)
 * derive from this so granting extra time un-flags "late" automatically.
 */
function effectiveDue(
  a: Assignment,
  sub: Submission | undefined,
  extensions: SubmissionExtension[]
): Date {
  const base = new Date(a.due_date);
  if (!sub) return base;
  let latest = base;
  for (const ext of extensions) {
    const targetsMe =
      (ext.studentId != null && ext.studentId === sub.studentId) ||
      (ext.groupId != null && sub.groupId != null && ext.groupId === sub.groupId);
    if (!targetsMe) continue;
    const d = new Date(ext.newDueAt);
    if (d > latest) latest = d;
  }
  return latest;
}

function statusOf(
  a: Assignment,
  sub: Submission | undefined,
  extensions: SubmissionExtension[]
): 'submitted' | 'late' | 'missing' {
  if (!sub) return 'missing';
  const due = effectiveDue(a, sub, extensions);
  return new Date(sub.submitted_at) > due ? 'late' : 'submitted';
}

export function CourseAssignments({ courseId, isStudent }: CourseAssignmentsProps) {
  const { data: assignments = [], isLoading } = useAssignments(courseId);
  const createMutation = useCreateAssignment(courseId);
  const deleteMutation = useDeleteAssignment(courseId);

  const [view, setView] = useState<'list' | 'submissions'>('list');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'submitted' | 'late' | 'missing'>('all');

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const [createOpen, setCreateOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadMutation = useUploadAttachments(courseId);
  const deleteAttachmentMutation = useDeleteAttachment(courseId);

  const [outcome, setOutcome] = useState<Outcome>('grade');
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<{
    reasoning: string;
    confidence: 'low' | 'medium' | 'high';
    model: string;
  } | null>(null);
  const [extensionDate, setExtensionDate] = useState('');
  const [extensionReason, setExtensionReason] = useState('');
  const [alsoApplyTo, setAlsoApplyTo] = useState<Set<number>>(new Set());
  const [submitUrl, setSubmitUrl] = useState('');

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDate, setBulkDate] = useState('');
  const [bulkReason, setBulkReason] = useState('');

  const gradeMutation = useGradeSubmission(selectedAssignment?.id ?? 0);
  const extensionMutation = useGrantExtension(selectedAssignment?.id ?? 0);
  const extensionBatchMutation = useGrantExtensionBatch(selectedAssignment?.id ?? 0);
  const aiSuggestMutation = useSuggestGradeWithAi();
  const submitMutation = useSubmitWork(selectedAssignment?.id ?? 0);

  const { data: submissions = [], isLoading: subsLoading } = useSubmissions(
    selectedAssignment?.id ?? null
  );
  const { data: extensions = [] } = useExtensions(selectedAssignment?.id ?? null);

  const filteredAssignments = useMemo(
    () => assignments.filter((a) => a.title.toLowerCase().includes(search.toLowerCase())),
    [assignments, search]
  );

  const submissionsByStudent = useMemo(() => {
    const m = new Map<number, Submission>();
    for (const s of submissions) m.set(s.studentId, s);
    return m;
  }, [submissions]);

  /// Called by `<CreateAssignmentForm>` with already-validated values
  /// (cross-field rules live in the Zod schema).
  const handleCreate = async (values: AssignmentFormValues) => {
    try {
      const created = await createMutation.mutateAsync({
        title: values.title,
        description: values.description || undefined,
        open_at: values.open_at ? new Date(values.open_at).toISOString() : null,
        due_date: new Date(values.due_date).toISOString(),
        workMode: values.workMode,
        gradingScope: values.gradingScope,
        lateWindowMinutes: values.allowLate ? Number(values.lateWindow) || 0 : 0
      });
      if (pendingFiles.length === 0) {
        toast.success('Assignment created');
      } else {
        try {
          const { count } = await uploadMutation.mutateAsync({
            assignmentId: created.id,
            files: pendingFiles
          });
          toast.success(
            `Assignment created · ${count} file${count === 1 ? '' : 's'} attached`
          );
        } catch (e) {
          toast.error(
            `Assignment saved, but file upload failed: ${e instanceof Error ? e.message : ''}`
          );
        }
      }
      setCreateOpen(false);
      setPendingFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Create failed');
    }
  };

  const handlePickFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    // Hard limit: 25 MB per file (server enforces too).
    const oversized = files.find((f) => f.size > 25 * 1024 * 1024);
    if (oversized) {
      toast.error(`"${oversized.name}" exceeds the 25 MB limit`);
      event.target.value = '';
      return;
    }
    setPendingFiles((prev) => [...prev, ...files]);
    event.target.value = '';
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const queryClient = useQueryClient();
  const { run: runDelete } = useDeleteWithUndo();

  const handleDelete = (id: number) => {
    const key = assignmentKeys.list(courseId);
    const snapshot = queryClient.getQueryData<Assignment[]>(key);
    if (!snapshot) return;
    const removed = snapshot.find((a) => a.id === id);
    if (!removed) return;
    runDelete({
      label: `Assignment deleted · "${removed.title}"`,
      optimisticallyRemove: () => {
        queryClient.setQueryData<Assignment[]>(key, (prev) =>
          (prev ?? []).filter((a) => a.id !== id)
        );
      },
      restore: () => queryClient.setQueryData<Assignment[]>(key, () => snapshot),
      commit: () => deleteAssignmentCall(id)
    });
  };

  const openSubmissions = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setSelectedRows(new Set());
    setView('submissions');
  };

  const openGrading = (sub: Submission) => {
    setSelectedSubmission(sub);
    setOutcome('grade');
    setGrade(sub.grade != null ? String(sub.grade) : '');
    setFeedback(sub.feedback ?? '');
    setExtensionDate('');
    setExtensionReason('');
    setAlsoApplyTo(new Set());
    setAiSuggestion(null);
    setDrawerOpen(true);
  };

  const handleAiSuggest = () => {
    if (!selectedAssignment || !selectedSubmission) return;
    aiSuggestMutation.mutate(
      { assignmentId: selectedAssignment.id, submissionId: selectedSubmission.id },
      {
        onSuccess: (s) => {
          setGrade(String(s.suggestedGrade));
          setFeedback(s.suggestedFeedback);
          setOutcome('grade');
          setAiSuggestion({
            reasoning: s.reasoningSummary,
            confidence: s.confidence,
            model: s.model
          });
          toast.success(`AI suggestion: ${s.suggestedGrade}% (${s.confidence} confidence)`);
        },
        onError: (e: Error) => toast.error(e.message)
      }
    );
  };

  const handleSaveGrade = () => {
    if (!selectedSubmission) return;
    gradeMutation.mutate(
      {
        submissionId: selectedSubmission.id,
        grade: grade === '' ? undefined : Number(grade),
        feedback: feedback || undefined,
        is_reviewed: true
      },
      {
        onSuccess: () => {
          toast.success(
            selectedAssignment?.gradingScope === 'GROUP'
              ? 'Grade saved — applied to all group members'
              : 'Grade saved'
          );
          setDrawerOpen(false);
        },
        onError: (e: Error) => toast.error(e.message)
      }
    );
  };

  const handleMarkMissing = () => {
    if (!selectedSubmission) return;
    gradeMutation.mutate(
      { submissionId: selectedSubmission.id, feedback: feedback || undefined, is_reviewed: true },
      {
        onSuccess: () => {
          toast.success('Marked as reviewed (no grade)');
          setDrawerOpen(false);
        },
        onError: (e: Error) => toast.error(e.message)
      }
    );
  };

  const handleGiveAnotherChance = () => {
    if (!selectedAssignment || !selectedSubmission || !extensionDate) {
      toast.error('Pick a new due date');
      return;
    }
    const isGroupGraded = selectedAssignment.gradingScope === 'GROUP';
    const newDueAt = new Date(extensionDate).toISOString();
    const reason = extensionReason || undefined;

    if (isGroupGraded && selectedSubmission.groupId != null) {
      // Group grading: single group target — batch endpoint not needed.
      extensionMutation.mutate(
        { groupId: selectedSubmission.groupId, newDueAt, reason },
        {
          onSuccess: () => {
            toast.success('Another chance granted to the group');
            setDrawerOpen(false);
          },
          onError: (e: Error) => toast.error(e.message)
        }
      );
      return;
    }

    // Individual grading: one or many students at once.
    const studentIds = Array.from(
      new Set<number>([selectedSubmission.studentId, ...alsoApplyTo])
    );
    extensionBatchMutation.mutate(
      { studentIds, newDueAt, reason },
      {
        onSuccess: ({ count }) => {
          toast.success(`Another chance granted (${count} student${count === 1 ? '' : 's'})`);
          setDrawerOpen(false);
        },
        onError: (e: Error) => toast.error(e.message)
      }
    );
  };

  const handleBulkExtend = () => {
    if (!selectedAssignment || !bulkDate || selectedRows.size === 0) {
      toast.error('Pick students and a new due date');
      return;
    }
    const newDueAt = new Date(bulkDate).toISOString();
    const reason = bulkReason || undefined;
    const isGroupGraded = selectedAssignment.gradingScope === 'GROUP';

    if (isGroupGraded) {
      // Map studentIds → unique groupIds from their submissions.
      const groupIds = Array.from(
        new Set(
          Array.from(selectedRows)
            .map((sid) => submissionsByStudent.get(sid)?.groupId)
            .filter((g): g is number => typeof g === 'number')
        )
      );
      if (groupIds.length === 0) {
        toast.error('Selected submissions have no groupId');
        return;
      }
      extensionBatchMutation.mutate(
        { groupIds, newDueAt, reason },
        {
          onSuccess: ({ count }) => {
            toast.success(`Extension granted to ${count} group${count === 1 ? '' : 's'}`);
            setBulkOpen(false);
            setSelectedRows(new Set());
            setBulkDate('');
            setBulkReason('');
          },
          onError: (e: Error) => toast.error(e.message)
        }
      );
    } else {
      extensionBatchMutation.mutate(
        { studentIds: Array.from(selectedRows), newDueAt, reason },
        {
          onSuccess: ({ count }) => {
            toast.success(`Extension granted to ${count} student${count === 1 ? '' : 's'}`);
            setBulkOpen(false);
            setSelectedRows(new Set());
            setBulkDate('');
            setBulkReason('');
          },
          onError: (e: Error) => toast.error(e.message)
        }
      );
    }
  };

  const handleStudentSubmit = (a: Assignment) => {
    if (!submitUrl.trim()) {
      toast.error('Paste a link to your work first');
      return;
    }
    setSelectedAssignment(a);
    submitMutation.mutate(
      { link: submitUrl },
      {
        onSuccess: () => {
          toast.success('Submitted');
          setSubmitUrl('');
        },
        onError: (e: Error) => toast.error(e.message)
      }
    );
  };

  // ── Student view ───────────────────────────────────────────────────────
  if (isStudent) {
    return (
      <div className='space-y-4'>
        {filteredAssignments.length > 0 && (
          <div className='flex justify-end'>
            <a
              href={courseAssignmentsIcsUrl(courseId)}
              className='inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground'
            >
              <CalendarPlus className='w-3 h-3' /> Subscribe to all deadlines (.ics)
            </a>
          </div>
        )}
        {isLoading && <ListSkeleton variant='card' count={3} />}
        {!isLoading && filteredAssignments.length === 0 && (
          <EmptyState
            icon={ClipboardCheck}
            title='No assignments yet'
            description='Your teacher hasn’t posted any work for this course.'
          />
        )}
        {filteredAssignments
          .filter((a) => !a.is_draft)
          .map((a) => {
            const now = new Date();
            const openAt = a.open_at ? new Date(a.open_at) : null;
            const due = new Date(a.due_date);
            const notOpenYet = openAt != null && now < openAt;
            const closed =
              now > new Date(due.getTime() + (a.lateWindowMinutes ?? 0) * 60_000);
            return (
              <div key={a.id} className='border rounded-lg p-4'>
                <div className='flex items-center justify-between mb-2'>
                  <span className='font-medium'>{a.title}</span>
                  <div className='flex gap-1'>
                    <Badge variant='outline'>
                      {a.workMode === 'GROUP' ? 'Group work' : 'Individual'}
                    </Badge>
                    {a.gradingScope === 'GROUP' && <Badge>Group grade</Badge>}
                  </div>
                </div>
                {a.description && (
                  <p className='text-sm text-muted-foreground mb-2'>{a.description}</p>
                )}
                <div className='flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground'>
                  {openAt && (
                    <span>Opens: {format(openAt, 'MMM d, yyyy h:mm a')}</span>
                  )}
                  <span>Due: {format(due, 'MMM d, yyyy h:mm a')}</span>
                  <a
                    href={assignmentIcsUrl(a.id)}
                    className='inline-flex items-center gap-1 hover:underline'
                  >
                    <CalendarPlus className='w-3 h-3' /> Add to calendar
                  </a>
                </div>
                {a.attachments && a.attachments.length > 0 && (
                  <div className='mt-2 space-y-1'>
                    {a.attachments.map((att) => (
                      <div
                        key={att.id}
                        className='flex items-center gap-2 text-xs bg-muted/30 rounded px-2 py-1'
                      >
                        <Paperclip className='w-3 h-3 text-muted-foreground shrink-0' />
                        <a
                          href={att.url}
                          target='_blank'
                          rel='noreferrer'
                          className='truncate flex-1 hover:underline'
                        >
                          {att.name}
                        </a>
                        {typeof att.size === 'number' && (
                          <span className='text-muted-foreground shrink-0'>
                            {(att.size / 1024).toFixed(1)} KB
                          </span>
                        )}
                        <a
                          href={attachmentDownloadUrl(att.id)}
                          className='inline-flex items-center gap-1 text-muted-foreground hover:text-foreground shrink-0'
                          title='Download'
                        >
                          <Download className='w-3 h-3' />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
                <div className='flex gap-2 mt-3'>
                  <Input
                    placeholder={
                      notOpenYet
                        ? 'Submissions open soon…'
                        : closed
                          ? 'Submissions closed'
                          : 'Paste a link to your work...'
                    }
                    value={submitUrl}
                    onChange={(e) => setSubmitUrl(e.target.value)}
                    disabled={notOpenYet || closed}
                  />
                  <Button
                    onClick={() => handleStudentSubmit(a)}
                    disabled={submitMutation.isPending || notOpenYet || closed}
                  >
                    {notOpenYet ? 'Not open yet' : closed ? 'Closed' : 'Submit'}
                  </Button>
                </div>
              </div>
            );
          })}
      </div>
    );
  }

  // ── Submissions view (teacher) ─────────────────────────────────────────
  if (view === 'submissions' && selectedAssignment) {
    const subRows = Array.from(submissionsByStudent.values());
    const filteredSubs = subRows.filter((s) => {
      if (filter === 'all') return true;
      return statusOf(selectedAssignment, s, extensions) === filter;
    });

    const otherStudentsForExtension = subRows.filter(
      (s) => s.studentId !== selectedSubmission?.studentId
    );

    return (
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <Button variant='ghost' onClick={() => setView('list')} className='gap-1'>
            <ArrowLeft className='w-4 h-4' /> Back
          </Button>
          {selectedRows.size > 0 && (
            <Button
              variant='outline'
              className='gap-1'
              onClick={() => setBulkOpen(true)}
            >
              <CalendarClock className='w-4 h-4' /> Grant extension to {selectedRows.size}
            </Button>
          )}
        </div>

        <div className='mb-4 space-y-2'>
          <h2 className='text-xl font-bold'>{selectedAssignment.title}</h2>
          <p className='text-sm text-muted-foreground'>
            Due: {format(new Date(selectedAssignment.due_date), 'MMMM d, yyyy h:mm a')} ·{' '}
            <Badge variant='outline' className='ml-1'>
              {selectedAssignment.workMode === 'GROUP' ? 'Group work' : 'Individual work'}
            </Badge>{' '}
            <Badge variant='outline'>
              {selectedAssignment.gradingScope === 'GROUP' ? 'Group grade' : 'Individual grade'}
            </Badge>
            {selectedAssignment.lateWindowMinutes > 0 &&
              ` · late window ${selectedAssignment.lateWindowMinutes}m`}
          </p>
          {selectedAssignment.attachments && selectedAssignment.attachments.length > 0 && (
            <div className='flex flex-wrap gap-2'>
              {selectedAssignment.attachments.map((att) => (
                <div
                  key={att.id}
                  className='flex items-center gap-2 text-xs border rounded px-2 py-1'
                >
                  <Paperclip className='w-3 h-3 text-muted-foreground' />
                  <a
                    href={att.url}
                    target='_blank'
                    rel='noreferrer'
                    className='hover:underline'
                  >
                    {att.name}
                  </a>
                  <a
                    href={attachmentDownloadUrl(att.id)}
                    className='text-muted-foreground hover:text-foreground'
                    title='Download'
                  >
                    <Download className='w-3 h-3' />
                  </a>
                  <button
                    type='button'
                    className='text-muted-foreground hover:text-destructive'
                    onClick={() => {
                      if (!confirm(`Delete "${att.name}"?`)) return;
                      deleteAttachmentMutation.mutate({
                        assignmentId: selectedAssignment.id,
                        attachmentId: att.id
                      });
                    }}
                    aria-label='Delete attachment'
                  >
                    <XIcon className='w-3 h-3' />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className='flex gap-2 mb-4'>
          {(['all', 'submitted', 'late', 'missing'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size='sm'
              onClick={() => setFilter(f)}
            >
              {f} (
              {f === 'all'
                ? subRows.length
                : subRows.filter((s) => statusOf(selectedAssignment, s, extensions) === f).length}
              )
            </Button>
          ))}
        </div>

        {subsLoading && <p className='text-sm text-muted-foreground'>Loading…</p>}

        <div className='border rounded-lg overflow-hidden'>
          <Table>
            <TableHeader className='bg-muted/30'>
              <TableRow>
                <TableHead className='w-8'></TableHead>
                <TableHead>Student</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Effective due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubs.map((sub) => {
                const status = statusOf(selectedAssignment, sub, extensions);
                const eff = effectiveDue(selectedAssignment, sub, extensions);
                const isOverridden =
                  eff.getTime() !== new Date(selectedAssignment.due_date).getTime();
                const isChecked = selectedRows.has(sub.studentId);
                return (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(v) => {
                          setSelectedRows((prev) => {
                            const next = new Set(prev);
                            if (v) next.add(sub.studentId);
                            else next.delete(sub.studentId);
                            return next;
                          });
                        }}
                      />
                    </TableCell>
                    <TableCell className='font-medium'>{sub.student?.full_name ?? '—'}</TableCell>
                    <TableCell>{sub.student?.number ?? '—'}</TableCell>
                    <TableCell>
                      {sub.submitted_at
                        ? format(new Date(sub.submitted_at), 'MMM d, h:mm a')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <span className={isOverridden ? 'font-medium text-amber-600 dark:text-amber-400' : ''}>
                        {format(eff, 'MMM d, h:mm a')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          status === 'submitted'
                            ? 'default'
                            : status === 'late'
                              ? 'outline'
                              : 'secondary'
                        }
                      >
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell>{sub.grade != null ? `${sub.grade}%` : '—'}</TableCell>
                    <TableCell>
                      <Button variant='ghost' size='sm' onClick={() => openGrading(sub)}>
                        Grade
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Grading drawer */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent className='w-full sm:max-w-4xl overflow-y-auto'>
            <SheetHeader>
              <SheetTitle>Review submission</SheetTitle>
            </SheetHeader>
            {selectedSubmission && (
              <div className='flex gap-4 py-4'>
                <div className='flex-1 min-w-0 space-y-4'>
                <div className='p-3 bg-muted/30 rounded'>
                  <p className='font-medium'>{selectedSubmission.student?.full_name ?? '—'}</p>
                  <p className='text-sm text-muted-foreground'>
                    {selectedSubmission.student?.number ?? '—'}
                  </p>
                  {selectedAssignment.gradingScope === 'GROUP' && (
                    <Badge variant='outline' className='mt-2'>
                      Group grade · fans out to all members
                    </Badge>
                  )}
                </div>

                {selectedSubmission.content_url ? (
                  isPdfUrl(selectedSubmission.content_url) ? (
                    <PdfViewer url={selectedSubmission.content_url} />
                  ) : (
                    <a
                      href={selectedSubmission.content_url}
                      target='_blank'
                      rel='noreferrer'
                      className='inline-flex items-center gap-1 text-sm border rounded-md px-3 py-1.5 hover:bg-muted/30'
                    >
                      <Download className='w-4 h-4' /> Open submission
                    </a>
                  )
                ) : (
                  <p className='text-xs text-muted-foreground italic'>No file attached.</p>
                )}

                <div className='flex items-center justify-between gap-2 rounded-lg border border-dashed p-3'>
                  <div className='flex items-center gap-2 text-sm'>
                    <Sparkles className='w-4 h-4 text-primary' />
                    <span className='text-muted-foreground'>
                      Let Claude draft a grade + feedback — you decide whether to keep, edit,
                      or discard it.
                    </span>
                  </div>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='gap-1 shrink-0'
                    onClick={handleAiSuggest}
                    disabled={aiSuggestMutation.isPending}
                  >
                    {aiSuggestMutation.isPending ? (
                      <Loader2 className='w-3.5 h-3.5 animate-spin' />
                    ) : (
                      <Sparkles className='w-3.5 h-3.5' />
                    )}
                    {aiSuggestMutation.isPending ? 'Thinking…' : 'Suggest with AI'}
                  </Button>
                </div>

                {aiSuggestion && (
                  <div className='border rounded-lg p-3 bg-primary/5 space-y-2'>
                    <div className='flex items-center justify-between gap-2'>
                      <Badge variant='outline' className='gap-1'>
                        <Sparkles className='w-3 h-3 text-primary' />
                        AI-assisted draft · {aiSuggestion.confidence} confidence
                      </Badge>
                      <button
                        type='button'
                        className='text-xs text-muted-foreground hover:text-foreground'
                        onClick={() => setAiSuggestion(null)}
                        aria-label='Dismiss AI banner'
                      >
                        Dismiss
                      </button>
                    </div>
                    <p className='text-xs text-muted-foreground italic'>
                      {aiSuggestion.reasoning}
                    </p>
                    <p className='text-[10px] text-muted-foreground'>
                      Model: {aiSuggestion.model} · Edit the grade or feedback to override.
                    </p>
                  </div>
                )}

                <div className='space-y-2'>
                  <Label>Feedback</Label>
                  <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={4}
                    placeholder='Comments to the student (used for all outcomes)…'
                  />
                </div>

                <div className='border rounded-lg p-3 space-y-3'>
                  <Label className='text-sm font-medium'>Outcome</Label>

                  <label className='flex items-start gap-2 cursor-pointer'>
                    <input
                      type='radio'
                      checked={outcome === 'grade'}
                      onChange={() => setOutcome('grade')}
                      className='mt-1'
                    />
                    <div className='flex-1'>
                      <p className='text-sm font-medium'>Accept &amp; grade</p>
                      {outcome === 'grade' && (
                        <div className='mt-2 flex gap-2 items-center'>
                          <Input
                            type='number'
                            min={0}
                            max={100}
                            value={grade}
                            onChange={(e) => setGrade(e.target.value)}
                            placeholder='0-100'
                            className='w-32'
                          />
                          <Button
                            size='sm'
                            onClick={handleSaveGrade}
                            disabled={gradeMutation.isPending}
                          >
                            {gradeMutation.isPending ? 'Saving…' : 'Save grade'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </label>

                  <label className='flex items-start gap-2 cursor-pointer'>
                    <input
                      type='radio'
                      checked={outcome === 'extend'}
                      onChange={() => setOutcome('extend')}
                      className='mt-1'
                    />
                    <div className='flex-1'>
                      <p className='text-sm font-medium'>Give another chance</p>
                      {outcome === 'extend' && (
                        <div className='mt-2 space-y-2'>
                          <Input
                            type='datetime-local'
                            value={extensionDate}
                            onChange={(e) => setExtensionDate(e.target.value)}
                          />
                          <Input
                            placeholder='Reason (optional)'
                            value={extensionReason}
                            onChange={(e) => setExtensionReason(e.target.value)}
                          />
                          {selectedAssignment.gradingScope === 'INDIVIDUAL' &&
                            otherStudentsForExtension.length > 0 && (
                              <div className='border rounded p-2 max-h-40 overflow-y-auto'>
                                <p className='text-xs font-medium mb-1 text-muted-foreground'>
                                  Also apply to:
                                </p>
                                {otherStudentsForExtension.map((s) => (
                                  <label
                                    key={s.studentId}
                                    className='flex items-center gap-2 text-sm py-0.5'
                                  >
                                    <Checkbox
                                      checked={alsoApplyTo.has(s.studentId)}
                                      onCheckedChange={(v) => {
                                        setAlsoApplyTo((prev) => {
                                          const next = new Set(prev);
                                          if (v) next.add(s.studentId);
                                          else next.delete(s.studentId);
                                          return next;
                                        });
                                      }}
                                    />
                                    {s.student?.full_name ?? `#${s.studentId}`}
                                  </label>
                                ))}
                              </div>
                            )}
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={handleGiveAnotherChance}
                            disabled={
                              extensionMutation.isPending || extensionBatchMutation.isPending
                            }
                          >
                            {selectedAssignment.gradingScope === 'GROUP'
                              ? 'Grant to group'
                              : `Grant another chance${alsoApplyTo.size > 0 ? ` (${alsoApplyTo.size + 1})` : ''}`}
                          </Button>
                        </div>
                      )}
                    </div>
                  </label>

                  <label className='flex items-start gap-2 cursor-pointer'>
                    <input
                      type='radio'
                      checked={outcome === 'missing'}
                      onChange={() => setOutcome('missing')}
                      className='mt-1'
                    />
                    <div className='flex-1'>
                      <p className='text-sm font-medium'>Mark as missing</p>
                      {outcome === 'missing' && (
                        <Button
                          size='sm'
                          variant='outline'
                          className='mt-2'
                          onClick={handleMarkMissing}
                          disabled={gradeMutation.isPending}
                        >
                          Save without grade
                        </Button>
                      )}
                    </div>
                  </label>
                </div>
                </div>
                {selectedSubmission.student && (
                  <StudentContextRail
                    courseId={courseId}
                    studentId={selectedSubmission.student.id}
                    studentName={selectedSubmission.student.full_name}
                  />
                )}
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Bulk extension dialog */}
        <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
          <DialogContent className='max-w-md'>
            <DialogHeader>
              <DialogTitle>Grant extension to {selectedRows.size} students</DialogTitle>
            </DialogHeader>
            <div className='space-y-3 py-2'>
              <Input
                type='datetime-local'
                value={bulkDate}
                onChange={(e) => setBulkDate(e.target.value)}
              />
              <Input
                placeholder='Reason (optional)'
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setBulkOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkExtend} disabled={extensionBatchMutation.isPending}>
                {extensionBatchMutation.isPending ? 'Granting…' : 'Grant'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Teacher list view ──────────────────────────────────────────────────
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

      {isLoading && <ListSkeleton variant='card' count={3} />}
      {!isLoading && filteredAssignments.length === 0 && (
        <EmptyState
          icon={ClipboardCheck}
          title='No assignments yet'
          description='Create your first assignment to share with this section.'
          actionLabel='Create assignment'
          onAction={() => setCreateOpen(true)}
        />
      )}

      {filteredAssignments.length > 0 && (
        <div className='border rounded-lg overflow-hidden'>
          <Table>
            <TableHeader className='bg-muted/30'>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Work</TableHead>
                <TableHead>Grading</TableHead>
                <TableHead>Opens</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Submissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.map((a) => {
                const attCount = a.attachments?.length ?? 0;
                return (
                  <TableRow key={a.id}>
                    <TableCell className='font-medium'>
                      <div className='flex items-center gap-2'>
                        <span>{a.title}</span>
                        {attCount > 0 && (
                          <span
                            className='inline-flex items-center gap-0.5 text-xs text-muted-foreground'
                            title={`${attCount} attachment${attCount === 1 ? '' : 's'}`}
                          >
                            <Paperclip className='w-3 h-3' />
                            {attCount}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant='outline'>{a.workMode}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant='outline'>{a.gradingScope}</Badge>
                    </TableCell>
                    <TableCell className='text-muted-foreground'>
                      {a.open_at ? format(new Date(a.open_at), 'MMM d, h:mm a') : '—'}
                    </TableCell>
                    <TableCell>{format(new Date(a.due_date), 'MMM d, h:mm a')}</TableCell>
                    <TableCell className='text-emerald-600 dark:text-emerald-400'>
                      {a._count?.submissions ?? a.submissions?.length ?? 0}
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.is_draft ? 'secondary' : 'default'}>
                        {a.is_draft ? 'draft' : 'published'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className='flex gap-1 justify-end'>
                        <a
                          href={assignmentIcsUrl(a.id)}
                          className='inline-flex items-center justify-center h-8 w-8 text-muted-foreground hover:text-foreground'
                          title='Add to calendar'
                        >
                          <CalendarPlus className='w-4 h-4' />
                        </a>
                        <Button variant='ghost' size='sm' onClick={() => openSubmissions(a)}>
                          <Eye className='w-4 h-4 mr-1' /> View
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='text-destructive'
                          onClick={() => handleDelete(a.id)}
                        >
                          <Trash2 className='w-4 h-4' />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='max-w-md max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Create Assignment</DialogTitle>
          </DialogHeader>

          {/* Attachments live outside the form because they ride on a
              separate upload endpoint that runs after the assignment is
              created. The form's submit handler reads `pendingFiles` from
              this component's state. */}
          <div className='space-y-2'>
            <input
              ref={fileInputRef}
              type='file'
              multiple
              onChange={handlePickFiles}
              className='hidden'
            />
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='gap-1'
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className='w-4 h-4' /> Add attachments
            </Button>
            {pendingFiles.length > 0 && (
              <ul className='space-y-1'>
                {pendingFiles.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className='flex items-center justify-between text-xs bg-muted/40 rounded px-2 py-1'
                  >
                    <span className='truncate'>
                      {f.name}{' '}
                      <span className='text-muted-foreground'>
                        ({(f.size / 1024).toFixed(1)} KB)
                      </span>
                    </span>
                    <button
                      type='button'
                      onClick={() => removePendingFile(i)}
                      className='text-muted-foreground hover:text-destructive shrink-0 ml-2'
                      aria-label='Remove file'
                    >
                      <XIcon className='w-3.5 h-3.5' />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className='text-[10px] text-muted-foreground'>Up to 10 files, 25 MB each.</p>
          </div>

          <CreateAssignmentForm
            onSubmit={handleCreate}
            pending={createMutation.isPending || uploadMutation.isPending}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
