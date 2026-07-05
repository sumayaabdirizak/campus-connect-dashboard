'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Search,
  Plus,
  Eye,
  Download,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  CalendarClock,
  CalendarPlus,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Copy,
  Link as LinkIcon,
  MoreHorizontal,
  Pencil,
  Square,
  Trash2,
  Upload,
  Paperclip,
  X as XIcon,
  ClipboardCheck,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Crown,
  Users
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { EmptyState } from './_shared/empty-state';
import { ListSkeleton } from './_shared/list-skeleton';
import { cn } from '@/lib/utils';
import { AddToCalendarButton } from '@/components/add-to-calendar-button';
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
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
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
  useDuplicateAssignment,
  useExtensions,
  useGradeSubmission,
  useGrantExtension,
  useGrantExtensionBatch,
  useMyAssignmentSummary,
  useMySubmission,
  useSubmissions,
  useSubmitWork,
  useUpdateAssignment,
  useUploadAttachments,
  useUploadSubmissionFile
} from '../api/assignments-queries';
import { useRoster } from '../api/roster-queries';
import { useGroups } from '../api/groups-queries';
import type { CourseGroup } from '../api/groups-types';
import { updateAssignment as updateAssignmentCall } from '../api/assignments-service';
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

type SubmissionRow = {
  studentId: number;
  student: { id: number; full_name: string; email: string; number: string };
  submission: Submission | null;
};

type GroupRow = {
  groupId: number;
  groupName: string;
  members: { id: number; full_name: string; email: string; number: string }[];
  submission: Submission | null;
};

function SubmissionFileCell({
  submission,
  label
}: {
  submission: Submission | null | undefined;
  label: string;
}) {
  if (!submission?.content_url) {
    return <span className='text-xs text-muted-foreground'>—</span>;
  }

  return (
    <a
      href={submission.content_url}
      target='_blank'
      rel='noreferrer'
      download
      className='inline-flex size-8 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground'
      title={`Download ${label}`}
      aria-label={`Download ${label}`}
    >
      <Download className='size-4' aria-hidden />
    </a>
  );
}

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
  const { data: groups = [] } = useGroups(courseId);
  const createMutation = useCreateAssignment(courseId);
  const deleteMutation = useDeleteAssignment(courseId);

  const [view, setView] = useState<'list' | 'submissions'>('list');
  const [search, setSearch] = useState('');
  const [assignmentListFilter, setAssignmentListFilter] = useState<
    'all' | 'live' | 'draft' | 'grading' | 'overdue'
  >('all');
  /// Submission filter pills. Status-based (submitted / late / missing) and
  /// review-based (ungraded / graded) live in the same dimension because
  /// the teacher only ever wants one filter active at a time — combining
  /// would just produce two-line query strings nobody asked for.
  const [filter, setFilter] = useState<
    'all' | 'submitted' | 'late' | 'missing' | 'ungraded' | 'graded'
  >('all');

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
  const [extensionDate, setExtensionDate] = useState('');
  const [extensionReason, setExtensionReason] = useState('');

  // ── Per-member grading state for GROUP + INDIVIDUAL assignments ──────
  // When grading a group with gradingScope=INDIVIDUAL, the drawer shows
  // each member with their own grade + feedback input. Maps memberId → value.
  const [memberGrades, setMemberGrades] = useState<Map<number, string>>(new Map());
  const [memberFeedbacks, setMemberFeedbacks] = useState<Map<number, string>>(new Map());

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDate, setBulkDate] = useState('');
  const [bulkReason, setBulkReason] = useState('');

  // Edit dialog state. null = closed; an Assignment = editing that one.
  // Reuses CreateAssignmentForm via its `initialValues` prop so the create/
  // edit shapes never drift apart. Editing doesn't touch attachments here —
  // attachment add/remove already happens inline on the submissions page.
  const [editTarget, setEditTarget] = useState<Assignment | null>(null);

  // Confirm-delete state for attachments (replaces the native confirm()).
  const [attachmentToDelete, setAttachmentToDelete] =
    useState<{ assignmentId: number; attachmentId: number; name: string } | null>(null);

  // Student-side submission state — kept separate from the teacher's
  // grading state so the same component can render either view cleanly.
  // `submitMode` controls whether the student types a link or uploads a file.
  const [submitModes, setSubmitModes] = useState<Record<number, 'link' | 'file'>>({});
  const [submitUrls, setSubmitUrls] = useState<Record<number, string>>({});
  const [pendingSubmissionFiles, setPendingSubmissionFiles] = useState<Record<number, File | null>>({});
  const submissionFileInputRef = useRef<HTMLInputElement | null>(null);
  // `submittingFor` tracks which assignment the student is currently
  // submitting to so the loading spinner sits on the right card.
  const [submittingFor, setSubmittingFor] = useState<number | null>(null);

  const submitModeFor = (assignmentId: number) => submitModes[assignmentId] ?? 'link';
  const submitUrlFor = (assignmentId: number) => submitUrls[assignmentId] ?? '';
  const pendingSubmissionFileFor = (assignmentId: number) =>
    pendingSubmissionFiles[assignmentId] ?? null;
  const setSubmitModeFor = (assignmentId: number, mode: 'link' | 'file') => {
    setSubmitModes((prev) => ({ ...prev, [assignmentId]: mode }));
  };
  const setSubmitUrlFor = (assignmentId: number, value: string) => {
    setSubmitUrls((prev) => ({ ...prev, [assignmentId]: value }));
  };
  const setPendingSubmissionFileFor = (assignmentId: number, file: File | null) => {
    setPendingSubmissionFiles((prev) => ({ ...prev, [assignmentId]: file }));
  };

  // Bulk-selection state for the teacher assignment list. Separate from
  // `selectedRows` (which targets submissions within a single assignment).
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<Set<number>>(new Set());
  const toggleAssignmentSelect = (id: number) => {
    setSelectedAssignmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearAssignmentSelection = () => setSelectedAssignmentIds(new Set());

  // Submissions table sort + search state.
  type SubmissionSortKey = 'name' | 'submitted_at' | 'grade' | 'status';
  const [subSort, setSubSort] = useState<{ key: SubmissionSortKey; dir: 'asc' | 'desc' }>({
    key: 'name',
    dir: 'asc',
  });
  const [subSearch, setSubSearch] = useState('');

  // Quick feedback templates — saved phrases the teacher can stamp into the
  // feedback textarea with one click. Stored per-course in localStorage so
  // they sync across browser tabs but don't need a backend write path.
  // We seed a few sensible defaults on first use so the chip strip is
  // never empty (and the teacher learns the feature exists).
  const TEMPLATE_STORAGE_KEY = `cc.assign.fb-templates.${courseId}`;
  const DEFAULT_TEMPLATES = [
    'Great work! Clear and well-reasoned.',
    'Good effort — please cite sources next time.',
    'See feedback inline; revise and resubmit.',
    'Missing the required components.',
  ];
  const [templates, setTemplates] = useState<string[]>([]);
  const [newTemplate, setNewTemplate] = useState('');
  const [templatesMenuOpen, setTemplatesMenuOpen] = useState(false);
  // Hydrate from localStorage after mount so SSR + client render match.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every((t) => typeof t === 'string')) {
          setTemplates(parsed);
          return;
        }
      }
      setTemplates(DEFAULT_TEMPLATES);
      window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(DEFAULT_TEMPLATES));
    } catch {
      setTemplates(DEFAULT_TEMPLATES);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const persistTemplates = (next: string[]) => {
    setTemplates(next);
    try { window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(next)); } catch {}
  };
  const insertTemplate = (text: string) => {
    setFeedback((prev) => (prev.trim() ? `${prev.trim()}\n\n${text}` : text));
  };

  // Bulk grading state — for the submissions table selection.
  const [bulkGradeOpen, setBulkGradeOpen] = useState(false);
  const [bulkGradeValue, setBulkGradeValue] = useState('');
  const [bulkGradeFeedback, setBulkGradeFeedback] = useState('');
  const [bulkGradeRunning, setBulkGradeRunning] = useState(false);

  // Multi-tab guard for the submissions view. If a second tab opens the
  // same assignment's grading page, both tabs raise a banner. Last-writer
  // wins on PATCH, so warning makes the implicit explicit.
  const [multiTabGradingConflict, setMultiTabGradingConflict] = useState(false);

  // Mutation hooks: unbound from selectedAssignment.id now (see the
  // assignments-queries.ts comment on the L1/L2 bug fix). The component
  // passes assignmentId per `.mutate()` call below so the request always
  // targets the intended row, regardless of selection-state timing.
  const gradeMutation = useGradeSubmission();
  const extensionMutation = useGrantExtension();
  const extensionBatchMutation = useGrantExtensionBatch();
  const submitMutation = useSubmitWork();
  const updateAssignmentMutation = useUpdateAssignment(courseId);
  const uploadSubmissionFileMutation = useUploadSubmissionFile();
  const duplicateAssignmentMutation = useDuplicateAssignment(courseId);

  const { data: submissions = [], isLoading: subsLoading } = useSubmissions(
    selectedAssignment?.id ?? null
  );
  const { data: extensions = [] } = useExtensions(selectedAssignment?.id ?? null);
  const { data: roster = [] } = useRoster(courseId);

  const filteredAssignments = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const now = new Date();
    return assignments.filter((a) => {
      const matchesSearch =
        !needle ||
        a.title.toLowerCase().includes(needle) ||
        (a.description ?? '').toLowerCase().includes(needle);
      if (!matchesSearch) return false;
      if (assignmentListFilter === 'live') return !a.is_draft;
      if (assignmentListFilter === 'draft') return a.is_draft;
      if (assignmentListFilter === 'grading') return (a.pendingGradingCount ?? 0) > 0;
      if (assignmentListFilter === 'overdue') return !a.is_draft && new Date(a.due_date) < now;
      return true;
    });
  }, [assignments, assignmentListFilter, search]);

  const submissionsByStudent = useMemo(() => {
    const m = new Map<number, Submission>();
    for (const s of submissions) m.set(s.studentId, s);
    return m;
  }, [submissions]);

  // Full class roster merged with submissions. Every enrolled student appears
  // regardless of whether they submitted — non-submitters show as "Missing".
  const allStudentRows = useMemo<SubmissionRow[]>(
    () =>
      roster.map((rs) => ({
        studentId: rs.id,
        student: rs,
        submission: submissionsByStudent.get(rs.id) ?? null,
      })),
    [roster, submissionsByStudent]
  );

  // ── Group-based rows for GROUP assignments ────────────────────────────
  // One row per CourseGroup instead of per student. The group's submission
  // is the first submission with a matching groupId (all members share the
  // same grade via fan-out). Ungrouped students are shown separately.
  // When gradingScope=INDIVIDUAL, the table still shows groups but the
  // grading modal shows individual member inputs inside it.
  const isGroupMode = selectedAssignment?.workMode === 'GROUP';

  const submissionsByGroup = useMemo(() => {
    const m = new Map<number, Submission>();
    for (const s of submissions) {
      if (s.groupId != null && !m.has(s.groupId)) m.set(s.groupId, s);
    }
    return m;
  }, [submissions]);

  const allGroupRows = useMemo<GroupRow[]>(() => {
    return groups.map((g) => ({
      groupId: g.id,
      groupName: g.name,
      members: g.members.map((m) => m.member),
      submission: submissionsByGroup.get(g.id) ?? null,
    }));
  }, [groups, submissionsByGroup]);

  const downloadGradeCsv = () => {
    if (!selectedAssignment) return;
    const header = ['Name', 'Student ID', 'Email', 'Submitted At', 'Status', 'Grade (%)', 'Feedback'];
    const rows = allStudentRows.map(({ student, submission: sub }) => {
      const status = sub
        ? statusOf(selectedAssignment, sub, extensions)
        : 'missing';
      return [
        student.full_name,
        student.number,
        student.email,
        sub?.submitted_at ? format(new Date(sub.submitted_at), 'yyyy-MM-dd HH:mm') : '',
        status,
        sub?.grade != null ? String(sub.grade) : '',
        sub?.feedback ?? '',
      ];
    });
    // CSV-cell escaper with formula-injection guard. A cell that *starts* with
    // =, +, -, @ (or a tab/CR) is executed as a formula by Excel / Sheets — and
    // here `feedback` is free-form teacher text, the most likely place for a
    // leading `=`. Prefix those with a single quote so the cell stays text.
    const csvSafe = (value: unknown) => {
      let s = String(value ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = [header, ...rows]
      .map((r) => r.map(csvSafe).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedAssignment.title.replace(/[^a-z0-9]/gi, '_')}_grades.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /// Called by `<CreateAssignmentForm>` with already-validated values
  /// (cross-field rules live in the Zod schema).
  const handleCreate = async (values: AssignmentFormValues) => {
    // Block GROUP assignment creation when no groups exist yet.
    if (values.workMode === 'GROUP' && groups.length === 0) {
      toast.error('Create groups first — go to the Groups tab and add at least one group before creating a group assignment.');
      return;
    }
    try {
      const created = await createMutation.mutateAsync({
        title: values.title,
        description: values.description || undefined,
        open_at: values.open_at ? new Date(values.open_at).toISOString() : null,
        due_date: new Date(values.due_date).toISOString(),
        workMode: values.workMode,
        gradingScope: values.gradingScope,
        lateWindowMinutes: values.allowLate ? Number(values.lateWindow) || 0 : 0,
        maxMarks: values.maxMarks
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
      // Auto-download .ics so the teacher's calendar app picks up the deadline.
      try {
        const a = document.createElement('a');
        a.href = assignmentIcsUrl(created.id);
        a.download = `${created.title ?? 'assignment'}.ics`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch {
        // Non-critical — don't block the flow if download fails.
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

  /// Optimistic publish-toggle on the teacher assignment row. Flips
  /// is_draft in cache immediately so the badge updates without a network
  /// flash, rolls back on PATCH failure. Same pattern as Quiz Phase 2.
  const togglePublish = (assignment: Assignment) => {
    const key = assignmentKeys.list(courseId);
    const nextDraft = !assignment.is_draft;
    const snapshot = queryClient.getQueryData<Assignment[]>(key);
    queryClient.setQueryData<Assignment[]>(key, (prev) =>
      (prev ?? []).map((a) => (a.id === assignment.id ? { ...a, is_draft: nextDraft } : a))
    );
    updateAssignmentMutation.mutate(
      { id: assignment.id, input: { is_draft: nextDraft } },
      {
        onSuccess: () => {
          toast.success(nextDraft ? 'Assignment unpublished' : 'Assignment published');
        },
        onError: (e: Error) => {
          if (snapshot) queryClient.setQueryData<Assignment[]>(key, snapshot);
          toast.error(e.message);
        },
      }
    );
  };

  const handleDuplicate = (assignment: Assignment) => {
    duplicateAssignmentMutation.mutate(assignment.id, {
      onSuccess: () => toast.success(`Duplicated "${assignment.title}" as a draft`),
      onError: (e: Error) => toast.error(e.message),
    });
  };

  /// Run N requests in parallel via Promise.allSettled — partial failures
  /// still report what worked. One cache invalidation after the whole batch
  /// instead of N. Same shape as the Quiz bulk runner.
  const runAssignmentBulk = async (
    label: string,
    op: (id: number) => Promise<unknown>
  ) => {
    const ids = Array.from(selectedAssignmentIds);
    if (ids.length === 0) return;
    const results = await Promise.allSettled(ids.map(op));
    const okCount = results.filter((r) => r.status === 'fulfilled').length;
    const failCount = results.length - okCount;
    queryClient.invalidateQueries({ queryKey: assignmentKeys.list(courseId) });
    if (failCount === 0) {
      toast.success(`${label} ${okCount} assignment${okCount === 1 ? '' : 's'}`);
    } else if (okCount === 0) {
      toast.error(`Failed to ${label.toLowerCase()} ${failCount} assignment${failCount === 1 ? '' : 's'}`);
    } else {
      toast.warning(`${label} ${okCount}, failed ${failCount}`);
    }
    clearAssignmentSelection();
  };

  const handleBulkPublishAssignments = (draft: boolean) =>
    runAssignmentBulk(draft ? 'Unpublished' : 'Published', (id) =>
      updateAssignmentCall(id, { is_draft: draft })
    );
  const handleBulkDeleteAssignments = () =>
    runAssignmentBulk('Deleted', (id) => deleteAssignmentCall(id));

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
    setMultiTabGradingConflict(false); // reset per assignment
  };

  // Multi-tab grading guard — BroadcastChannel keyed on the assignment id.
  // When this tab enters the submissions/grading view it announces "claim";
  // if another tab is already grading it replies "ack" and both render a
  // warning banner. Grades-stop-here is what the backend enforces (PATCH
  // is last-writer-wins), but the student deserves a consistent grade —
  // so the teacher should pick one tab. Graceful degradation when the API
  // is missing (older Safari).
  useEffect(() => {
    if (view !== 'submissions' || !selectedAssignment) return;
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(`assignment-grading-${selectedAssignment.id}`);
    let acknowledged = false;
    channel.onmessage = (e) => {
      if (e.data === 'claim') {
        channel.postMessage('ack');
        setMultiTabGradingConflict(true);
      } else if (e.data === 'ack' && !acknowledged) {
        acknowledged = true;
        setMultiTabGradingConflict(true);
      }
    };
    channel.postMessage('claim');
    return () => channel.close();
  }, [view, selectedAssignment]);

  const openGrading = (sub: Submission) => {
    setSelectedSubmission(sub);
    setOutcome('grade');
    setGrade(sub.grade != null ? String(sub.grade) : '');
    setFeedback(sub.feedback ?? '');
    setExtensionDate('');
    setExtensionReason('');

    // For GROUP + INDIVIDUAL: populate per-member grades from existing submissions
    if (
      selectedAssignment?.workMode === 'GROUP' &&
      selectedAssignment?.gradingScope === 'INDIVIDUAL' &&
      sub.groupId != null
    ) {
      const groupSubs = submissions.filter((s) => s.groupId === sub.groupId);
      const grades = new Map<number, string>();
      const feedbacks = new Map<number, string>();
      for (const s of groupSubs) {
        grades.set(s.studentId, s.grade != null ? String(s.grade) : '');
        feedbacks.set(s.studentId, s.feedback ?? '');
      }
      setMemberGrades(grades);
      setMemberFeedbacks(feedbacks);
    } else {
      setMemberGrades(new Map());
      setMemberFeedbacks(new Map());
    }

    setDrawerOpen(true);
  };

  /// Save the grade. When `andNext` is true, advance to the next submission
  /// in the current sort/filter order instead of closing the drawer.
  /// Computed in the submissions view scope, so the helper accepts the
  /// next-target submission via an explicit arg (cleanest way to pass it).
  const handleSaveGrade = (next?: Submission | null) => {
    if (!selectedSubmission || !selectedAssignment) return;
    if (grade !== '') {
      const g = Number(grade);
      const cap = selectedAssignment.maxMarks ?? 100;
      if (Number.isNaN(g) || g < 0 || g > cap) {
        toast.error(`Grade must be between 0 and ${cap}`);
        return;
      }
    }
    gradeMutation.mutate(
      {
        assignmentId: selectedAssignment.id,
        input: {
          submissionId: selectedSubmission.id,
          grade: grade === '' ? undefined : Number(grade),
          feedback: feedback || undefined,
          is_reviewed: true
        }
      },
      {
        onSuccess: () => {
          toast.success(
            selectedAssignment.gradingScope === 'GROUP'
              ? 'Grade saved — applied to all group members'
              : 'Grade saved'
          );
          if (next) {
            openGrading(next);
          } else {
            setDrawerOpen(false);
          }
        },
        onError: (e: Error) => toast.error(e.message)
      }
    );
  };

  /// Save individual grades for all members of a group (GROUP + INDIVIDUAL).
  /// Runs all grade mutations in parallel via Promise.allSettled.
  const handleSaveIndividualGrades = async () => {
    if (!selectedAssignment || !selectedSubmission?.groupId) return;
    const cap = selectedAssignment.maxMarks ?? 100;
    const groupId = selectedSubmission.groupId;

    // Iterate the group's members (matching the modal UI), not the raw
    // submission rows. Match each member to their own submission via studentId.
    const groupRow = allGroupRows.find((r) => r.groupId === groupId);
    if (!groupRow) return;
    const subsByStudent = new Map(
      submissions
        .filter((s) => s.groupId === groupId)
        .map((s) => [s.studentId, s] as const)
    );

    // Validate all entered grades before sending.
    for (const member of groupRow.members) {
      const val = memberGrades.get(member.id);
      if (val !== undefined && val !== '') {
        const g = Number(val);
        if (Number.isNaN(g) || g < 0 || g > cap) {
          toast.error(`Grade for ${member.full_name} must be 0–${cap}`);
          return;
        }
      }
    }

    // Only members with an existing submission row can be graded (the grade
    // endpoint keys off submissionId). Members without one are skipped.
    const gradable = groupRow.members.filter((m) => subsByStudent.has(m.id));
    const skipped = groupRow.members.length - gradable.length;

    const results = await Promise.allSettled(
      gradable.map((member) => {
        const sub = subsByStudent.get(member.id)!;
        const val = memberGrades.get(member.id);
        return gradeMutation.mutateAsync({
          assignmentId: selectedAssignment.id,
          input: {
            submissionId: sub.id,
            grade: val === undefined || val === '' ? undefined : Number(val),
            feedback: memberFeedbacks.get(member.id) || undefined,
            is_reviewed: true
          }
        });
      })
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      toast.error(`${failed} grade(s) failed to save`);
    } else {
      toast.success(
        `Grades saved for ${results.length} member${results.length !== 1 ? 's' : ''}` +
          (skipped > 0 ? ` · ${skipped} skipped (no submission)` : '')
      );
      setDrawerOpen(false);
    }
  };

  const handleMarkMissing = () => {
    if (!selectedSubmission || !selectedAssignment) return;
    gradeMutation.mutate(
      {
        assignmentId: selectedAssignment.id,
        input: {
          submissionId: selectedSubmission.id,
          feedback: feedback || undefined,
          is_reviewed: true
        }
      },
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
        {
          assignmentId: selectedAssignment.id,
          input: { groupId: selectedSubmission.groupId, newDueAt, reason }
        },
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

    // Individual grading: extend for the current student only.
    extensionBatchMutation.mutate(
      {
        assignmentId: selectedAssignment.id,
        input: { studentIds: [selectedSubmission.studentId], newDueAt, reason }
      },
      {
        onSuccess: ({ count }) => {
          toast.success(`Another chance granted (${count} student${count === 1 ? '' : 's'})`);
          setDrawerOpen(false);
        },
        onError: (e: Error) => toast.error(e.message)
      }
    );
  };

  /// Bulk grade — apply the same grade + feedback to every selected
  /// submission. Common for participation marks (everyone gets 10%) and
  /// quick "OK" passes. Runs requests in parallel via Promise.allSettled
  /// so partial failures still report what worked.
  const handleBulkGrade = async () => {
    if (!selectedAssignment || selectedRows.size === 0) return;
    const gradeNum = bulkGradeValue === '' ? undefined : Number(bulkGradeValue);
    const cap = selectedAssignment.maxMarks ?? 100;
    if (gradeNum != null && (Number.isNaN(gradeNum) || gradeNum < 0 || gradeNum > cap)) {
      toast.error(`Grade must be 0–${cap}`);
      return;
    }
    setBulkGradeRunning(true);
    try {
      // Map student ids → submission rows so we can call the grade endpoint
      // (which is keyed on submissionId, not studentId).
      const targets = Array.from(selectedRows)
        .map((sid) => submissionsByStudent.get(sid))
        .filter((s): s is Submission => s != null);
      const results = await Promise.allSettled(
        targets.map((sub) =>
          gradeMutation.mutateAsync({
            assignmentId: selectedAssignment.id,
            input: {
              submissionId: sub.id,
              grade: gradeNum,
              feedback: bulkGradeFeedback || undefined,
              is_reviewed: true,
            },
          })
        )
      );
      const okCount = results.filter((r) => r.status === 'fulfilled').length;
      const failCount = results.length - okCount;
      if (failCount === 0) {
        toast.success(`Graded ${okCount} submission${okCount === 1 ? '' : 's'}`);
      } else if (okCount === 0) {
        toast.error(`Failed to grade ${failCount} submission${failCount === 1 ? '' : 's'}`);
      } else {
        toast.warning(`Graded ${okCount}, failed ${failCount}`);
      }
      setBulkGradeOpen(false);
      setBulkGradeValue('');
      setBulkGradeFeedback('');
      setSelectedRows(new Set());
    } finally {
      setBulkGradeRunning(false);
    }
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
        {
          assignmentId: selectedAssignment.id,
          input: { groupIds, newDueAt, reason }
        },
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
        {
          assignmentId: selectedAssignment.id,
          input: { studentIds: Array.from(selectedRows), newDueAt, reason }
        },
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

  /// Student submit handler. Takes the assignment as an arg (NOT from
  /// selectedAssignment state) so the mutation always targets the right
  /// row — selectedAssignment is only set after the mutation completes.
  /// Two paths:
  ///   - 'link' mode: pass `link: submitUrl` directly
  ///   - 'file' mode: upload the file first, then submit with the returned URL
  const handleStudentSubmit = async (a: Assignment) => {
    const submitMode = submitModeFor(a.id);
    const submitUrl = submitUrlFor(a.id);
    const pendingSubmissionFile = pendingSubmissionFileFor(a.id);

    if (submitMode === 'link' && !submitUrl.trim()) {
      toast.error('Paste a link to your work first');
      return;
    }
    if (submitMode === 'file' && !pendingSubmissionFile) {
      toast.error('Pick a file to upload first');
      return;
    }
    setSubmittingFor(a.id);
    try {
      let urlToSubmit = submitUrl.trim();
      if (submitMode === 'file' && pendingSubmissionFile) {
        const uploaded = await uploadSubmissionFileMutation.mutateAsync({
          assignmentId: a.id,
          file: pendingSubmissionFile,
        });
        urlToSubmit = uploaded.url;
      }
      await submitMutation.mutateAsync({
        assignmentId: a.id,
        input: { link: urlToSubmit },
      });
      toast.success('Submitted');
      setSubmitUrlFor(a.id, '');
      setPendingSubmissionFileFor(a.id, null);
      if (submissionFileInputRef.current) submissionFileInputRef.current.value = '';
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setSubmittingFor(null);
    }
  };

  const handleEditAssignment = async (values: AssignmentFormValues) => {
    if (!editTarget) return;
    try {
      await updateAssignmentMutation.mutateAsync({
        id: editTarget.id,
        input: {
          title: values.title,
          description: values.description || undefined,
          open_at: values.open_at ? new Date(values.open_at).toISOString() : null,
          due_date: new Date(values.due_date).toISOString(),
          workMode: values.workMode,
          gradingScope: values.gradingScope,
          lateWindowMinutes: values.allowLate ? Number(values.lateWindow) || 0 : 0,
          maxMarks: values.maxMarks,
        },
      });
      toast.success('Assignment updated');
      setEditTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    }
  };

  // Map an Assignment row → CreateAssignmentForm `initialValues` shape. The
  // form expects local-datetime strings, not ISO, because <input
  // type="datetime-local"> stores `YYYY-MM-DDTHH:mm`.
  const editInitialValues = useMemo<Partial<AssignmentFormValues> | undefined>(() => {
    if (!editTarget) return undefined;
    const toLocal = (iso: string | null | undefined) =>
      iso ? new Date(iso).toISOString().slice(0, 16) : '';
    return {
      title: editTarget.title,
      description: editTarget.description ?? '',
      open_at: toLocal(editTarget.open_at),
      due_date: toLocal(editTarget.due_date),
      workMode: editTarget.workMode,
      gradingScope: editTarget.gradingScope,
      allowLate: (editTarget.lateWindowMinutes ?? 0) > 0,
      lateWindow: String(editTarget.lateWindowMinutes ?? 0),
      maxMarks: editTarget.maxMarks ?? 100,
    };
  }, [editTarget]);

  // ── Student view ───────────────────────────────────────────────────────
  if (isStudent) {
    const publishedAssignments = filteredAssignments.filter((a) => !a.is_draft);
    return (
      <div className='space-y-4'>
        {isLoading ? <AssignmentsLoadingState isStudent /> : <StudentSummaryCard courseId={courseId} />}
        {!isLoading && publishedAssignments.length > 0 && (
          <div className='flex justify-end'>
            <a
              href={courseAssignmentsIcsUrl(courseId)}
              className='inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground'
            >
              <CalendarPlus className='w-3 h-3' /> Subscribe to all deadlines (.ics)
            </a>
          </div>
        )}
        {!isLoading && publishedAssignments.length === 0 && (
          <AssignmentsEmptyState isStudent hasItems={filteredAssignments.length > 0} />
        )}
        {!isLoading && publishedAssignments.map((a) => (
          <StudentAssignmentCard
            key={a.id}
            courseOfferingPublicId={courseId}
            assignment={a}
            submitMode={submitModeFor(a.id)}
            onSubmitModeChange={(mode) => setSubmitModeFor(a.id, mode)}
            submitUrl={submitUrlFor(a.id)}
            onSubmitUrlChange={(value) => setSubmitUrlFor(a.id, value)}
            pendingFile={pendingSubmissionFileFor(a.id)}
            onPendingFileChange={(file) => setPendingSubmissionFileFor(a.id, file)}
            fileInputRef={submissionFileInputRef}
            isSubmitting={submittingFor === a.id}
            onSubmit={() => handleStudentSubmit(a)}
          />
        ))}
      </div>
    );
  }

  // ── Submissions view (teacher) ─────────────────────────────────────────
  if (view === 'submissions' && selectedAssignment) {
    // Filter → search → sort across the full enrolled roster (not just
    // submitters). Non-submitters always appear as "missing" so the teacher
    // sees the complete picture without manual cross-referencing.
    const filteredSubs = allStudentRows
      .filter((row) => {
        if (filter === 'all') return true;
        if (filter === 'ungraded') return !(row.submission?.is_reviewed ?? false);
        if (filter === 'graded') return row.submission?.is_reviewed ?? false;
        return statusOf(selectedAssignment, row.submission ?? undefined, extensions) === filter;
      })
      .filter((row) => {
        if (!subSearch.trim()) return true;
        const needle = subSearch.toLowerCase();
        return (
          row.student.full_name.toLowerCase().includes(needle) ||
          row.student.number.toLowerCase().includes(needle) ||
          row.student.email.toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => {
        const dir = subSort.dir === 'asc' ? 1 : -1;
        switch (subSort.key) {
          case 'name':
            return a.student.full_name.localeCompare(b.student.full_name) * dir;
          case 'submitted_at': {
            const av = a.submission?.submitted_at ? new Date(a.submission.submitted_at).getTime() : 0;
            const bv = b.submission?.submitted_at ? new Date(b.submission.submitted_at).getTime() : 0;
            return (av - bv) * dir;
          }
          case 'grade': {
            const av = a.submission?.grade;
            const bv = b.submission?.grade;
            if (av == null && bv == null) return 0;
            if (av == null) return 1;
            if (bv == null) return -1;
            return (av - bv) * dir;
          }
          case 'status': {
            const sa = statusOf(selectedAssignment, a.submission ?? undefined, extensions);
            const sb = statusOf(selectedAssignment, b.submission ?? undefined, extensions);
            return sa.localeCompare(sb) * dir;
          }
        }
      });

    // ── Group-mode filtering ──────────────────────────────────────────
    const filteredGroupSubs = isGroupMode
      ? allGroupRows
          .filter((row) => {
            if (filter === 'all') return true;
            if (filter === 'ungraded') return !(row.submission?.is_reviewed ?? false);
            if (filter === 'graded') return row.submission?.is_reviewed ?? false;
            if (filter === 'submitted') return row.submission !== null;
            if (filter === 'missing') return row.submission === null;
            if (filter === 'late') return row.submission?.is_late ?? false;
            return true;
          })
          .filter((row) => {
            if (!subSearch.trim()) return true;
            const needle = subSearch.toLowerCase();
            return (
              row.groupName.toLowerCase().includes(needle) ||
              row.members.some((m) => m.full_name.toLowerCase().includes(needle))
            );
          })
          .sort((a, b) => {
            const dir = subSort.dir === 'asc' ? 1 : -1;
            switch (subSort.key) {
              case 'name':
                return a.groupName.localeCompare(b.groupName) * dir;
              case 'submitted_at': {
                const av = a.submission?.submitted_at ? new Date(a.submission.submitted_at).getTime() : 0;
                const bv = b.submission?.submitted_at ? new Date(b.submission.submitted_at).getTime() : 0;
                return (av - bv) * dir;
              }
              case 'grade': {
                const av = a.submission?.grade;
                const bv = b.submission?.grade;
                if (av == null && bv == null) return 0;
                if (av == null) return 1;
                if (bv == null) return -1;
                return (av - bv) * dir;
              }
              case 'status': {
                const sa = a.submission ? (a.submission.is_late ? 'late' : 'submitted') : 'missing';
                const sb = b.submission ? (b.submission.is_late ? 'late' : 'submitted') : 'missing';
                return sa.localeCompare(sb) * dir;
              }
            }
          })
      : [];


    // Prev/Next navigation skips rows without a submission — can only open
    // the grading drawer for students who actually submitted something.
    const gradableRows = isGroupMode
      ? filteredGroupSubs.filter((r) => r.submission !== null)
      : filteredSubs.filter((r) => r.submission !== null);
    const currentSubIdx = selectedSubmission
      ? gradableRows.findIndex((r) => r.submission?.id === selectedSubmission.id)
      : -1;
    const nextSubmission =
      currentSubIdx >= 0 && currentSubIdx < gradableRows.length - 1
        ? gradableRows[currentSubIdx + 1].submission!
        : null;

    // Sort-header helper — renders a clickable column header with arrow.
    const SortHeader = ({
      label,
      sortKey,
    }: {
      label: string;
      sortKey: SubmissionSortKey;
    }) => {
      const active = subSort.key === sortKey;
      return (
        <button
          type='button'
          onClick={() =>
            setSubSort((prev) =>
              prev.key === sortKey
                ? { key: sortKey, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                : { key: sortKey, dir: 'asc' }
            )
          }
          className='inline-flex items-center gap-1 hover:text-foreground transition-colors'
        >
          {label}
          {active ? (
            subSort.dir === 'asc' ? (
              <ChevronUp className='w-3 h-3' />
            ) : (
              <ChevronDown className='w-3 h-3' />
            )
          ) : (
            <ArrowUpDown className='w-3 h-3 opacity-30' />
          )}
        </button>
      );
    };

    return (
      <div className='space-y-5'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <Button variant='ghost' onClick={() => setView('list')} className='gap-1 pl-0 hover:bg-transparent'>
            <ArrowLeft className='w-4 h-4' /> Back to table
          </Button>
          <div className='flex flex-wrap items-center gap-2'>
            {selectedRows.size > 0 && (
              <>
                <Button
                  variant='outline'
                  size='sm'
                  className='gap-1.5'
                  onClick={() => setBulkGradeOpen(true)}
                >
                  <ClipboardCheck className='w-4 h-4' /> Grade {selectedRows.size}
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  className='gap-1.5'
                  onClick={() => setBulkOpen(true)}
                >
                  <CalendarClock className='w-4 h-4' /> Extend {selectedRows.size}
                </Button>
              </>
            )}
            <Button variant='outline' size='sm' className='gap-1.5' onClick={downloadGradeCsv}>
              <Download className='w-4 h-4' /> Export CSV
            </Button>
          </div>
        </div>

        {/* Multi-tab grading banner — fires when another tab opens the same
            assignment's grading view. Same pattern as the Quiz attempt
            guard. Backend PATCH is last-writer-wins, so warn explicitly. */}
        {multiTabGradingConflict && (
          <div className='rounded-2xl border border-warning/30 bg-warning-muted px-4 py-3 text-sm text-warning-foreground shadow-sm'>
            <div className='flex items-start gap-2'>
              <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' />
              <div>
                <p className='font-medium'>This assignment is open in another tab.</p>
                <p className='text-xs'>
                  Grading in both tabs at once can overwrite changes. Close one tab before saving.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className='rounded-xl border bg-card px-4 py-3 shadow-sm sm:px-6'>
          <h2 className='truncate text-lg font-semibold'>{selectedAssignment.title}</h2>
          <p className='mt-1 text-sm text-muted-foreground'>
            Due {format(new Date(selectedAssignment.due_date), 'MMM d, yyyy h:mm a')}
            {' · '}
            {selectedAssignment.workMode === 'GROUP' ? 'Group work' : 'Individual work'}
            {' · '}
            {selectedAssignment.gradingScope === 'GROUP' ? 'Group grade' : 'Individual grade'}
            {selectedAssignment.lateWindowMinutes > 0 &&
              ` · ${selectedAssignment.lateWindowMinutes}m late window`}
          </p>
          {selectedAssignment.attachments && selectedAssignment.attachments.length > 0 && (
            <div className='mt-3 flex flex-wrap gap-2'>
              {selectedAssignment.attachments.map((att) => (
                <div
                  key={att.id}
                  className='flex items-center gap-2 rounded-md border px-2 py-1 text-xs'
                >
                  <Paperclip className='h-3 w-3 text-muted-foreground' />
                  <a href={att.url} target='_blank' rel='noreferrer' className='hover:underline'>
                    {att.name}
                  </a>
                  <a
                    href={attachmentDownloadUrl(att.id)}
                    className='text-muted-foreground hover:text-foreground'
                    title='Download'
                  >
                    <Download className='h-3 w-3' />
                  </a>
                  <button
                    type='button'
                    className='text-muted-foreground hover:text-destructive'
                    onClick={() =>
                      setAttachmentToDelete({
                        assignmentId: selectedAssignment.id,
                        attachmentId: att.id,
                        name: att.name
                      })
                    }
                    aria-label='Delete attachment'
                  >
                    <XIcon className='h-3 w-3' />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className='flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm xl:flex-row xl:items-center xl:justify-between'>
          {/* Filter pills — split into 2 segmented controls so the status
              dimension (submitted/late/missing) is visually separate from
              the review dimension (ungraded/graded). Only one can be
              active at a time; clicking on the other clears the first.
              That tradeoff keeps the filter logic predictable: one filter
              key, one query result. */}
          <SegmentedControl
            ariaLabel='Filter submissions by submission status'
            value={(['all', 'submitted', 'late', 'missing'] as const).includes(filter as 'all' | 'submitted' | 'late' | 'missing') ? (filter as 'all' | 'submitted' | 'late' | 'missing') : 'all'}
            onChange={setFilter}
            options={(['all', 'submitted', 'late', 'missing'] as const).map((f) => ({
              value: f,
              label: <span className='capitalize'>{f}</span>,
              count: isGroupMode
                ? f === 'all'
                  ? allGroupRows.length
                  : f === 'submitted'
                    ? allGroupRows.filter((r) => r.submission !== null).length
                    : f === 'missing'
                      ? allGroupRows.filter((r) => r.submission === null).length
                      : allGroupRows.filter((r) => r.submission?.is_late).length
                : f === 'all'
                  ? allStudentRows.length
                  : allStudentRows.filter(
                      (r) => statusOf(selectedAssignment, r.submission ?? undefined, extensions) === f
                    ).length
            }))}
          />
          <SegmentedControl
            ariaLabel='Filter submissions by review status'
            value={(['ungraded', 'graded'] as const).includes(filter as 'ungraded' | 'graded') ? (filter as 'ungraded' | 'graded') : 'ungraded'}
            onChange={setFilter}
            options={(['ungraded', 'graded'] as const).map((f) => ({
              value: f,
              label: <span className='capitalize'>{f}</span>,
              count: (isGroupMode ? allGroupRows : allStudentRows).filter((r) =>
                f === 'graded' ? (r.submission?.is_reviewed ?? false) : !(r.submission?.is_reviewed ?? false)
              ).length
            }))}
          />
          {/* Search by name / id / email */}
          <div className='relative w-full xl:max-w-sm'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
            <Input
              placeholder='Search students…'
              value={subSearch}
              onChange={(e) => setSubSearch(e.target.value)}
              className='pl-10 h-8'
            />
          </div>
        </div>

        {subsLoading && <ListSkeleton variant='row' count={4} />}

        <div className='overflow-hidden rounded-lg border bg-card shadow-sm'>
          <div className='max-h-[64vh] overflow-auto'>
          <Table className='min-w-[980px]'>
            <TableHeader className='sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85'>
              <TableRow className='hover:bg-transparent border-b [&>th]:h-10 [&>th]:text-[11px] [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground'>
                <TableHead className='w-10'></TableHead>
                <TableHead>
                  <SortHeader label={isGroupMode ? 'Group' : 'Student'} sortKey='name' />
                </TableHead>
                {isGroupMode && <TableHead>Members</TableHead>}
                <TableHead>
                  <SortHeader label='Submitted' sortKey='submitted_at' />
                </TableHead>
                {!isGroupMode && <TableHead>Effective due</TableHead>}
                <TableHead>
                  <SortHeader label='Status' sortKey='status' />
                </TableHead>
                <TableHead>
                  <SortHeader label='Grade' sortKey='grade' />
                </TableHead>
                <TableHead className='w-14'>File</TableHead>
                <TableHead className='w-32'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* ── Group-mode table body ─────────────────────────────── */}
              {isGroupMode && filteredGroupSubs.length === 0 && !subsLoading && (
                <TableRow>
                  <TableCell colSpan={8} className='text-center py-8 text-sm text-muted-foreground'>
                    {subSearch.trim() || filter !== 'all'
                      ? 'No groups match your filters.'
                      : groups.length === 0
                        ? 'No groups created yet — go to the Groups tab first.'
                        : 'No submissions yet.'}
                  </TableCell>
                </TableRow>
              )}
              {isGroupMode && filteredGroupSubs.map((row) => {
                const { groupId, groupName, members, submission: sub } = row;
                const status: 'submitted' | 'late' | 'missing' = sub
                  ? sub.is_late ? 'late' : 'submitted'
                  : 'missing';
                const isChecked = selectedRows.has(groupId);
                return (
                  <TableRow key={groupId} className={`transition-colors hover:bg-muted/35 [&>td]:py-3 ${!sub ? 'bg-muted/15 text-muted-foreground' : ''}`}>
                    <TableCell className='align-top'>
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(v) => {
                          setSelectedRows((prev) => {
                            const next = new Set(prev);
                            if (v) next.add(groupId);
                            else next.delete(groupId);
                            return next;
                          });
                        }}
                      />
                    </TableCell>
                    <TableCell className='align-top font-medium text-foreground'>
                      <div className='flex items-center gap-2'>
                        <Users className='w-4 h-4 text-muted-foreground shrink-0' />
                        {groupName}
                      </div>
                    </TableCell>
                    <TableCell className='align-top'>
                      <div className='flex flex-wrap gap-1'>
                        {members.map((m) => (
                          <span
                            key={m.id}
                            className='text-xs bg-muted/50 rounded px-1.5 py-0.5'
                            title={m.email}
                          >
                            {m.full_name}
                          </span>
                        ))}
                        {members.length === 0 && (
                          <span className='text-xs text-muted-foreground italic'>No members</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='align-top whitespace-nowrap'>
                      {sub?.submitted_at
                        ? format(new Date(sub.submitted_at), 'MMM d, h:mm a')
                        : <span className='text-muted-foreground text-xs'>—</span>}
                    </TableCell>
                    <TableCell className='align-top'>
                      <Badge
                        variant='outline'
                        className={`gap-1 capitalize ${
                          status === 'submitted'
                            ? 'text-success border-success'
                            : status === 'late'
                              ? 'text-warning border-warning'
                              : 'text-destructive border-destructive/40'
                        }`}
                      >
                        {status === 'submitted' && <Check className='w-3 h-3' />}
                        {status === 'late' && <AlertTriangle className='w-3 h-3' />}
                        {status === 'missing' && <XIcon className='w-3 h-3' />}
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell className='align-top'>
                      {sub?.grade != null ? (
                        <span className='tabular-nums font-medium'>{sub.grade}%</span>
                      ) : sub?.is_reviewed ? (
                        <span className='text-xs text-muted-foreground'>reviewed</span>
                      ) : (
                        <span className='text-xs text-muted-foreground'>—</span>
                      )}
                    </TableCell>
                    <TableCell className='align-top'>
                      <SubmissionFileCell submission={sub} label={`${groupName} submission`} />
                    </TableCell>
                    <TableCell className='align-top text-right'>
                      {sub ? (
                        <Button variant='outline' size='sm' onClick={() => openGrading(sub)}>
                          Grade
                        </Button>
                      ) : (
                        <span className='text-xs text-muted-foreground px-3'>No submission</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* ── Student-mode table body (individual assignments) ── */}
              {!isGroupMode && filteredSubs.length === 0 && !subsLoading && (
                <TableRow>
                  <TableCell colSpan={8} className='text-center py-8 text-sm text-muted-foreground'>
                    {subSearch.trim() || filter !== 'all'
                      ? 'No students match your filters.'
                      : roster.length === 0
                        ? 'No students enrolled yet.'
                        : 'No submissions yet.'}
                  </TableCell>
                </TableRow>
              )}
              {!isGroupMode && filteredSubs.map((row) => {
                const { studentId, student, submission: sub } = row;
                const status = statusOf(selectedAssignment, sub ?? undefined, extensions);
                const eff = sub
                  ? effectiveDue(selectedAssignment, sub, extensions)
                  : new Date(selectedAssignment.due_date);
                const isOverridden = sub
                  ? eff.getTime() !== new Date(selectedAssignment.due_date).getTime()
                  : false;
                const isChecked = selectedRows.has(studentId);
                return (
                  <TableRow key={studentId} className={`transition-colors hover:bg-muted/35 [&>td]:py-3 ${!sub ? 'bg-muted/15 text-muted-foreground' : ''}`}>
                    <TableCell className='align-top'>
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(v) => {
                          setSelectedRows((prev) => {
                            const next = new Set(prev);
                            if (v) next.add(studentId);
                            else next.delete(studentId);
                            return next;
                          });
                        }}
                      />
                    </TableCell>
                    <TableCell className='align-top'>
                      <div className='min-w-0'>
                        <p className='truncate font-medium text-foreground'>{student.full_name}</p>
                        <p className='truncate text-xs text-muted-foreground'>{student.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className='align-top whitespace-nowrap'>
                      {sub?.submitted_at
                        ? format(new Date(sub.submitted_at), 'MMM d, h:mm a')
                        : <span className='text-muted-foreground text-xs'>—</span>}
                    </TableCell>
                    <TableCell className='align-top whitespace-nowrap'>
                      <span className={isOverridden ? 'font-medium text-warning' : ''}>
                        {format(eff, 'MMM d, h:mm a')}
                      </span>
                    </TableCell>
                    <TableCell className='align-top'>
                      <Badge
                        variant='outline'
                        className={`gap-1 capitalize ${
                          status === 'submitted'
                            ? 'text-success border-success'
                            : status === 'late'
                              ? 'text-warning border-warning'
                              : 'text-destructive border-destructive/40'
                        }`}
                      >
                        {status === 'submitted' && <Check className='w-3 h-3' />}
                        {status === 'late' && <AlertTriangle className='w-3 h-3' />}
                        {status === 'missing' && <XIcon className='w-3 h-3' />}
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell className='align-top'>
                      {sub?.grade != null ? (
                        <span className='tabular-nums font-medium'>{sub.grade}%</span>
                      ) : sub?.is_reviewed ? (
                        <span className='text-xs text-muted-foreground'>reviewed</span>
                      ) : (
                        <span className='text-xs text-muted-foreground'>—</span>
                      )}
                    </TableCell>
                    <TableCell className='align-top'>
                      <SubmissionFileCell
                        submission={sub}
                        label={`${student.full_name}'s submission`}
                      />
                    </TableCell>
                    <TableCell className='align-top text-right'>
                      {sub ? (
                        <Button variant='outline' size='sm' onClick={() => openGrading(sub)}>
                          Grade
                        </Button>
                      ) : (
                        <span className='text-xs text-muted-foreground px-3'>No submission</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </div>

        {/* Grading drawer */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent className='w-full overflow-y-auto bg-background/95 sm:max-w-5xl'>
            <SheetTitle className='sr-only'>Review submission</SheetTitle>
            {selectedSubmission && (
              <div className='grid gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_320px]'>
                <div className='min-w-0 space-y-4'>
                <div className='rounded-3xl border bg-muted/20 p-4 shadow-sm'>
                  {selectedAssignment.workMode === 'GROUP' && selectedSubmission.groupId != null ? (() => {
                    const groupRow = allGroupRows.find((r) => r.groupId === selectedSubmission.groupId);
                    return (
                      <>
                        <div className='flex items-center gap-2'>
                          <Users className='w-4 h-4 text-muted-foreground' />
                          <p className='font-medium'>{groupRow?.groupName ?? 'Group'}</p>
                        </div>
                        <div className='mt-2 flex flex-wrap gap-1.5'>
                          {groupRow?.members.map((m) => (
                            <span key={m.id} className='rounded-full bg-background px-2 py-1 text-xs shadow-sm'>
                              {m.full_name}
                            </span>
                          ))}
                        </div>
                        <Badge variant='outline' className='mt-3'>
                          {selectedAssignment.gradingScope === 'GROUP'
                            ? 'Group grade · fans out to all members'
                            : 'Individual grade · each member graded separately'}
                        </Badge>
                      </>
                    );
                  })() : (
                    <>
                      <p className='font-medium'>{selectedSubmission.student?.full_name ?? '—'}</p>
                      <p className='text-sm text-muted-foreground'>
                        {selectedSubmission.student?.number ?? '—'}
                      </p>
                    </>
                  )}
                </div>

                {selectedSubmission.content_url ? (
                  isPdfUrl(selectedSubmission.content_url) ? (
                    <div className='overflow-hidden rounded-3xl border bg-card shadow-sm'>
                      <PdfViewer url={selectedSubmission.content_url} />
                    </div>
                  ) : null
                ) : (
                  <p className='text-xs text-muted-foreground italic'>No file attached.</p>
                )}

                <div className='space-y-3 rounded-3xl border bg-card p-4 shadow-sm'>
                  <div className='flex items-center justify-between gap-2'>
                    <Label>Feedback</Label>
                    {/* "Manage templates" toggle reveals the add-form. Keeps
                        the default state compact — chips below are the
                        primary affordance. */}
                    <button
                      type='button'
                      onClick={() => setTemplatesMenuOpen((v) => !v)}
                      className='text-[11px] text-muted-foreground hover:text-foreground transition-colors'
                    >
                      {templatesMenuOpen ? 'Done' : 'Manage templates'}
                    </button>
                  </div>
                  <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={4}
                    placeholder='Comments to the student (used for all outcomes)…'
                  />
                  {/* Quick-template chips. Click to append to the current
                      feedback (with a separator newline if there's already
                      text). Stored per-course in localStorage so teachers
                      build up their phrase library over a term. */}
                  {templates.length > 0 && (
                    <div className='flex flex-wrap gap-1.5'>
                      {templates.map((t, i) => (
                        <div
                          key={`${t}-${i}`}
                          className='group inline-flex items-center gap-1 rounded-full border bg-muted/40 pl-2.5 py-0.5 text-xs transition-colors hover:bg-muted/70'
                        >
                          <button
                            type='button'
                            onClick={() => insertTemplate(t)}
                            className='max-w-[28ch] truncate'
                            title={`Insert: "${t}"`}
                          >
                            {t}
                          </button>
                          {templatesMenuOpen && (
                            <button
                              type='button'
                              onClick={() =>
                                persistTemplates(templates.filter((_, j) => j !== i))
                              }
                              aria-label={`Remove template "${t}"`}
                              className='text-muted-foreground hover:text-destructive pr-1.5'
                            >
                              <XIcon className='w-3 h-3' />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {templatesMenuOpen && (
                    <div className='flex items-center gap-2 pt-1'>
                      <Input
                        value={newTemplate}
                        onChange={(e) => setNewTemplate(e.target.value)}
                        placeholder='Save a new template…'
                        className='h-8 text-xs'
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newTemplate.trim()) {
                            e.preventDefault();
                            persistTemplates([...templates, newTemplate.trim()]);
                            setNewTemplate('');
                          }
                        }}
                      />
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => {
                          if (!newTemplate.trim()) return;
                          persistTemplates([...templates, newTemplate.trim()]);
                          setNewTemplate('');
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  )}
                </div>

                {/* Outcome picker — tabs instead of stacked radio cards.
                    Cuts vertical space by ~60% and makes the three options
                    visible at a glance. Each tab body owns its own form
                    state from the parent scope (grade/feedback/extensionDate
                    etc.). The Save action lives inside each panel so the
                    teacher can't accidentally submit the wrong outcome. */}
                <div className='rounded-3xl border bg-card p-4 space-y-4 shadow-sm'>
                  <div className='flex items-center justify-between gap-2'>
                    <Label className='text-sm font-medium'>Outcome</Label>
                    <SegmentedControl
                      ariaLabel='Submission grading outcome'
                      value={outcome}
                      onChange={setOutcome}
                      options={[
                        { value: 'grade', label: 'Grade' },
                        { value: 'extend', label: 'Extend' },
                        { value: 'missing', label: 'Mark missing' }
                      ]}
                    />
                  </div>

                  {outcome === 'grade' &&
                    selectedAssignment.workMode === 'GROUP' &&
                    selectedAssignment.gradingScope === 'INDIVIDUAL' &&
                    selectedSubmission.groupId != null ? (
                    /* ── Per-member grade inputs (GROUP + INDIVIDUAL) ── */
                    <div className='space-y-3'>
                      {(() => {
                        const groupRow = allGroupRows.find(
                          (r) => r.groupId === selectedSubmission.groupId
                        );
                        if (!groupRow) return null;
                        const subsByStudent = new Map(
                          submissions
                            .filter((s) => s.groupId === selectedSubmission.groupId)
                            .map((s) => [s.studentId, s] as const)
                        );
                        const cap = selectedAssignment.maxMarks ?? 100;
                        return groupRow.members.map((member) => {
                          const sub = subsByStudent.get(member.id);
                          return (
                            <div key={member.id} className='rounded-2xl border bg-muted/20 p-3 space-y-2'>
                              <div className='flex items-center gap-2'>
                                <p className='text-sm font-medium'>
                                  {member.full_name}
                                </p>
                                <span className='text-xs text-muted-foreground'>
                                  {member.number}
                                </span>
                                {!sub && (
                                  <Badge variant='outline' className='text-[10px] text-muted-foreground'>
                                    No submission
                                  </Badge>
                                )}
                              </div>
                              <div className='flex gap-2 items-center'>
                                <Input
                                  type='number'
                                  min={0}
                                  max={cap}
                                  value={memberGrades.get(member.id) ?? ''}
                                  onChange={(e) =>
                                    setMemberGrades((prev) => {
                                      const next = new Map(prev);
                                      next.set(member.id, e.target.value);
                                      return next;
                                    })
                                  }
                                  placeholder={`0-${cap}`}
                                  className='w-24 h-8 text-sm'
                                />
                                <Input
                                  value={memberFeedbacks.get(member.id) ?? ''}
                                  onChange={(e) =>
                                    setMemberFeedbacks((prev) => {
                                      const next = new Map(prev);
                                      next.set(member.id, e.target.value);
                                      return next;
                                    })
                                  }
                                  placeholder='Feedback (optional)'
                                  className='flex-1 h-8 text-sm'
                                />
                              </div>
                            </div>
                          );
                        });
                      })()}
                      <Button
                        size='sm'
                        onClick={handleSaveIndividualGrades}
                        disabled={gradeMutation.isPending}
                      >
                        {gradeMutation.isPending ? 'Saving…' : 'Save all grades'}
                      </Button>
                    </div>
                  ) : outcome === 'grade' ? (
                    <div className='flex flex-wrap items-center gap-2'>
                      <Input
                        type='number'
                        min={0}
                        max={selectedAssignment?.maxMarks ?? 100}
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        placeholder={`0-${selectedAssignment?.maxMarks ?? 100}`}
                        className='w-32'
                      />
                      <Button
                        size='sm'
                        onClick={() => handleSaveGrade(null)}
                        disabled={gradeMutation.isPending}
                      >
                        {gradeMutation.isPending ? 'Saving…' : 'Save grade'}
                      </Button>
                      {nextSubmission && (
                        <Button
                          size='sm'
                          variant='outline'
                          className='gap-1'
                          onClick={() => handleSaveGrade(nextSubmission)}
                          disabled={gradeMutation.isPending}
                          title='Save this grade and jump to the next submission'
                        >
                          Save & Next
                          <ArrowRight className='w-3.5 h-3.5' />
                        </Button>
                      )}
                    </div>
                  ) : null}

                  {outcome === 'extend' && (
                    <div className='space-y-2'>
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
                          : 'Grant another chance'}
                      </Button>
                    </div>
                  )}

                  {outcome === 'missing' && (
                    <div className='space-y-2'>
                      <p className='text-xs text-muted-foreground'>
                        Mark this submission as reviewed without assigning a grade.
                        The student will see it as graded with no score.
                      </p>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={handleMarkMissing}
                        disabled={gradeMutation.isPending}
                      >
                        Save without grade
                      </Button>
                    </div>
                  )}
                </div>
                </div>
                <div className='space-y-4 lg:sticky lg:top-4'>
                  {selectedSubmission.student && (
                    <StudentContextRail
                      courseId={courseId}
                      studentId={selectedSubmission.student.id}
                      studentName={selectedSubmission.student.full_name}
                    />
                  )}
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Bulk grade dialog — applies the same grade + feedback to every
            selected submission. Common for participation marks and quick
            "OK" passes. Empty grade means "mark reviewed, no score". */}
        <Dialog open={bulkGradeOpen} onOpenChange={setBulkGradeOpen}>
          <DialogContent className='max-w-md'>
            <DialogHeader>
              <DialogTitle>Grade {selectedRows.size} submissions</DialogTitle>
            </DialogHeader>
            <div className='space-y-3 py-2'>
              <p className='text-xs text-muted-foreground'>
                Apply the same grade and feedback to every selected student.
                Leave grade blank to mark reviewed without a score.
              </p>
              <div className='space-y-1.5'>
                <Label className='text-xs'>Grade (0–{selectedAssignment?.maxMarks ?? 100})</Label>
                <Input
                  type='number'
                  min={0}
                  max={selectedAssignment?.maxMarks ?? 100}
                  value={bulkGradeValue}
                  onChange={(e) => setBulkGradeValue(e.target.value)}
                  placeholder={`e.g. ${Math.round((selectedAssignment?.maxMarks ?? 100) * 0.85)}`}
                />
              </div>
              <div className='space-y-1.5'>
                <Label className='text-xs'>Feedback (optional)</Label>
                <Textarea
                  value={bulkGradeFeedback}
                  onChange={(e) => setBulkGradeFeedback(e.target.value)}
                  rows={3}
                  placeholder='Comment shared with all selected students…'
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setBulkGradeOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkGrade} disabled={bulkGradeRunning}>
                {bulkGradeRunning ? (
                  <>
                    <Loader2 className='w-4 h-4 mr-1 animate-spin' />
                    Grading…
                  </>
                ) : (
                  `Apply to ${selectedRows.size}`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
  const listStats = {
    total: assignments.length,
    published: assignments.filter((a) => !a.is_draft).length,
    drafts: assignments.filter((a) => a.is_draft).length,
    overdue: assignments.filter((a) => !a.is_draft && new Date(a.due_date) < new Date()).length,
    pendingGrading: assignments.reduce((n, a) => n + (a.pendingGradingCount ?? 0), 0)
  };
  const listFilterOptions = [
    { value: 'all' as const, label: 'All', count: listStats.total },
    { value: 'live' as const, label: 'Live', count: listStats.published },
    { value: 'draft' as const, label: 'Drafts', count: listStats.drafts },
    { value: 'grading' as const, label: 'To grade', count: listStats.pendingGrading },
    { value: 'overdue' as const, label: 'Overdue', count: listStats.overdue }
  ];

  return (
    <div className='space-y-5'>
      <div className='overflow-hidden rounded-xl border bg-card shadow-sm'>
        <div className='flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6'>
          <h2 className='text-lg font-semibold tracking-tight'>Assignments</h2>
          <div className='flex flex-wrap items-center gap-2'>
            <Button onClick={() => setCreateOpen(true)} size='sm' className='gap-1.5'>
              <Plus className='w-4 h-4' /> Create assignment
            </Button>
          </div>
        </div>

        <div className='space-y-4 p-4 sm:p-6'>
          <div className='grid gap-3 lg:grid-cols-[1fr_360px] lg:items-center'>
            <div className='overflow-x-auto rounded-2xl border bg-muted/20 p-2'>
              <SegmentedControl
                value={assignmentListFilter}
                onChange={setAssignmentListFilter}
                options={listFilterOptions}
                ariaLabel='Filter assignments'
                width='auto'
              />
            </div>
            <div className='relative w-full'>
              <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                placeholder='Search title, instructions, attachments'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='h-10 rounded-2xl pl-10'
              />
            </div>
          </div>

          {isLoading && <AssignmentsLoadingState />}
          {!isLoading && filteredAssignments.length === 0 && (
            <AssignmentsEmptyState
              hasItems={assignments.length > 0}
              onCreate={assignments.length === 0 ? () => setCreateOpen(true) : undefined}
            />
          )}

      {/* Bulk action bar — appears when at least one assignment is selected.
          Sticky so it stays accessible while scrolling. Same shape as the
          Quiz bulk bar to keep the cross-tab UX consistent. */}
      {selectedAssignmentIds.size > 0 && (
        <div className='sticky top-0 z-10 -mx-1 px-1 pb-2 pt-1 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70'>
          <div className='flex items-center justify-between gap-3 flex-wrap rounded-2xl border bg-card p-3 shadow-sm'>
            <div className='flex items-center gap-3 min-w-0'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  if (selectedAssignmentIds.size === filteredAssignments.length)
                    clearAssignmentSelection();
                  else setSelectedAssignmentIds(new Set(filteredAssignments.map((a) => a.id)));
                }}
                className='gap-1'
              >
                {selectedAssignmentIds.size === filteredAssignments.length ? (
                  <CheckSquare className='w-4 h-4' />
                ) : (
                  <Square className='w-4 h-4' />
                )}
                {selectedAssignmentIds.size === filteredAssignments.length
                  ? 'Deselect all'
                  : 'Select all'}
              </Button>
              <p className='text-sm tabular-nums'>{selectedAssignmentIds.size} selected</p>
            </div>
            <div className='flex gap-2 flex-wrap'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handleBulkPublishAssignments(false)}
                className='gap-1'
              >
                <Check className='w-3.5 h-3.5' /> Publish
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handleBulkPublishAssignments(true)}
              >
                Unpublish
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={handleBulkDeleteAssignments}
                className='gap-1 text-destructive hover:text-destructive'
              >
                <Trash2 className='w-3.5 h-3.5' /> Delete
              </Button>
              <Button variant='ghost' size='sm' onClick={clearAssignmentSelection}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

          {filteredAssignments.length > 0 && (
        <div className='overflow-hidden rounded-lg border'>
          <div className='max-h-[65vh] overflow-auto'>
            <Table className='w-full table-fixed min-w-[940px]'>
            <TableHeader className='sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85'>
              <TableRow className='hover:bg-transparent border-b [&>th]:h-9 [&>th]:px-3 [&>th]:text-[10px] [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground'>
                <TableHead className='w-9'></TableHead>
                <TableHead className='min-w-0'>Title</TableHead>
                <TableHead className='w-24'>Work</TableHead>
                <TableHead className='w-28'>Grading</TableHead>
                <TableHead className='w-32'>Opens</TableHead>
                <TableHead className='w-32'>Due</TableHead>
                <TableHead className='w-28 text-right'>Submissions</TableHead>
                <TableHead className='w-20'>Status</TableHead>
                <TableHead className='w-28'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.map((a) => {
                const attCount = a.attachments?.length ?? 0;
                const isSelected = selectedAssignmentIds.has(a.id);
                const dueAt = new Date(a.due_date);
                const isOverdue = !a.is_draft && dueAt < new Date();
                const submissionCount = a._count?.submissions ?? a.submissions?.length ?? 0;
                const pendingCount = a.pendingGradingCount ?? 0;
                const workLabel = a.workMode === 'GROUP' ? 'Group' : 'Individual';
                const gradingLabel = a.gradingScope === 'GROUP' ? 'Group grade' : 'Per student';
                return (
                  <TableRow
                    key={a.id}
                    className={`group transition-colors hover:bg-muted/40 [&>td]:px-3 [&>td]:py-2.5 ${
                      isSelected ? 'bg-primary/[0.04]' : ''
                    } ${a.is_draft ? 'bg-muted/15' : ''}`}
                  >
                    <TableCell>
                      {/* Selection checkbox — same hover/visibility behaviour
                          as the Quiz card. Hidden until hover unless the row
                          is selected or a different row already is. */}
                      <button
                        type='button'
                        onClick={() => toggleAssignmentSelect(a.id)}
                        aria-label={isSelected ? `Deselect ${a.title}` : `Select ${a.title}`}
                        aria-pressed={isSelected}
                        className={`p-1 -m-1 rounded transition-opacity ${
                          isSelected || selectedAssignmentIds.size > 0
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-60 hover:!opacity-100 focus:opacity-100'
                        }`}
                      >
                        {isSelected ? (
                          <CheckSquare className='w-4 h-4 text-primary' />
                        ) : (
                          <Square className='w-4 h-4 text-muted-foreground' />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className='align-top'>
                      <div className='min-w-0 space-y-1'>
                        <div className='flex min-w-0 items-center gap-2'>
                          <span className='truncate font-medium'>{a.title}</span>
                          {attCount > 0 && (
                            <span
                              className='inline-flex shrink-0 items-center gap-0.5 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground'
                              title={`${attCount} attachment${attCount === 1 ? '' : 's'}`}
                            >
                              <Paperclip className='w-3 h-3' />
                              {attCount}
                            </span>
                          )}
                        </div>
                        {a.description && (
                          <p className='line-clamp-1 text-xs font-normal text-muted-foreground'>
                            {a.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='align-top'>
                      <Badge variant='outline' className='px-2 py-0.5 text-[10px] font-medium'>
                        {workLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className='align-top'>
                      <Badge variant='outline' className='px-2 py-0.5 text-[10px] font-medium'>
                        {gradingLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className='align-top whitespace-nowrap text-xs text-muted-foreground'>
                      {a.open_at ? format(new Date(a.open_at), 'MMM d, h:mm a') : '—'}
                    </TableCell>
                    <TableCell
                      className={`align-top whitespace-nowrap text-xs ${
                        isOverdue ? 'font-medium text-rose-600 dark:text-rose-400' : ''
                      }`}
                    >
                      <div className='flex flex-col gap-0.5'>
                        <span>{format(dueAt, 'MMM d, h:mm a')}</span>
                        {isOverdue && (
                          <span className='text-[10px] uppercase tracking-wide'>Overdue</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='align-top text-right'>
                      <div className='inline-flex flex-col items-end gap-0.5'>
                        <span className='text-sm font-semibold tabular-nums text-foreground'>
                          {submissionCount}
                        </span>
                        {pendingCount > 0 && (
                          <span className='rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300'>
                            {pendingCount} to grade
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {/* Read-only publish state. The toggle action moved to
                          the ⋯ menu (Publish / Unpublish). */}
                      <Badge
                        variant='outline'
                        className={`px-1.5 py-0 text-[10px] font-medium ${
                          a.is_draft
                            ? 'border-muted-foreground/20 text-muted-foreground'
                            : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                        title={
                          a.is_draft
                            ? 'Draft — students cannot see this assignment'
                            : 'Published — visible to students'
                        }
                      >
                        {a.is_draft ? 'Draft' : 'Live'}
                      </Badge>
                    </TableCell>
                    <TableCell className='align-top'>
                      <div className='flex gap-1 justify-end'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => openSubmissions(a)}
                          aria-label={
                            (a.pendingGradingCount ?? 0) > 0
                              ? `View ${a.title} — ${a.pendingGradingCount} need grading`
                              : `View ${a.title}`
                          }
                          className='relative h-7 px-2 text-xs shadow-sm'
                        >
                          <Eye className='w-3.5 h-3.5 mr-1' /> View
                          {(a.pendingGradingCount ?? 0) > 0 && (
                            <span
                              className='absolute -top-1.5 -right-1.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-semibold tabular-nums bg-destructive text-destructive-foreground shadow-sm'
                              title={`${a.pendingGradingCount} submission${a.pendingGradingCount === 1 ? '' : 's'} need grading`}
                            >
                              {a.pendingGradingCount}
                            </span>
                          )}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-7 w-7'
                              aria-label={`More actions for ${a.title}`}
                            >
                              <MoreHorizontal className='w-3.5 h-3.5' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end' className='w-44'>
                            <DropdownMenuLabel className='text-xs text-muted-foreground'>
                              Manage
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => togglePublish(a)}
                              className='gap-2'
                            >
                              {a.is_draft ? (
                                <>
                                  <Eye className='w-4 h-4' /> Publish
                                </>
                              ) : (
                                <>
                                  <EyeOff className='w-4 h-4' /> Unpublish
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setEditTarget(a)}
                              className='gap-2'
                            >
                              <Pencil className='w-4 h-4' /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDuplicate(a)}
                              className='gap-2'
                            >
                              <Copy className='w-4 h-4' /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className='gap-2'>
                              <a href={assignmentIcsUrl(a.id)}>
                                <CalendarPlus className='w-4 h-4' /> Calendar (.ics)
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(a.id)}
                              className='gap-2 text-destructive focus:text-destructive'
                            >
                              <Trash2 className='w-4 h-4' /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </div>
          )}

        </div>
      </div>

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

      {/* Edit dialog — reuses the same form via `initialValues`. Editing
          doesn't touch attachments here (the submissions page already has
          inline add/remove for those). */}
      <Dialog open={editTarget !== null} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className='max-w-md max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Edit assignment</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <CreateAssignmentForm
              initialValues={editInitialValues}
              onSubmit={handleEditAssignment}
              pending={updateAssignmentMutation.isPending}
              onCancel={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm attachment delete — replaces the native browser confirm()
          with the app's AlertDialog so the visual style is consistent. */}
      <AlertDialog
        open={attachmentToDelete !== null}
        onOpenChange={(open) => !open && setAttachmentToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete attachment?</AlertDialogTitle>
            <AlertDialogDescription>
              <span>
                Remove <strong>{attachmentToDelete?.name}</strong>? Students will lose access.
                This can&apos;t be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!attachmentToDelete) return;
                deleteAttachmentMutation.mutate(
                  {
                    assignmentId: attachmentToDelete.assignmentId,
                    attachmentId: attachmentToDelete.attachmentId,
                  },
                  {
                    onSuccess: () => toast.success(`Removed ${attachmentToDelete.name}`),
                    onError: (e: Error) => toast.error(e.message),
                  }
                );
                setAttachmentToDelete(null);
              }}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/// Student-facing per-assignment card. Owns its own `useMySubmission`
/// query so the card can render the student's submission state without
/// the parent having to fan out N queries. Three states this handles:
///
///   1. **Not submitted** + window open  → submit UI (link or file tabs)
///   2. **Submitted, ungraded**          → confirmation + resubmit option
///   3. **Submitted, graded**            → score + feedback + (maybe) resubmit
///
/// The submit UI itself supports two modes:
///   - 'link' — paste a URL
///   - 'file' — upload a single file (PDF, doc, etc.) up to 25 MB
/// Both go through the same `POST /submissions` endpoint; the file path
/// uploads first and uses the returned URL.
function StudentAssignmentCard({
  assignment: a,
  courseOfferingPublicId,
  submitMode,
  onSubmitModeChange,
  submitUrl,
  onSubmitUrlChange,
  pendingFile,
  onPendingFileChange,
  fileInputRef,
  isSubmitting,
  onSubmit,
}: {
  assignment: Assignment;
  courseOfferingPublicId: string;
  submitMode: 'link' | 'file';
  onSubmitModeChange: (mode: 'link' | 'file') => void;
  submitUrl: string;
  onSubmitUrlChange: (v: string) => void;
  pendingFile: File | null;
  onPendingFileChange: (f: File | null) => void;
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  isSubmitting: boolean;
  onSubmit: () => void;
}) {
  const { data: rawMySubmission } = useMySubmission(a.id);

  // The my-submission endpoint returns `{ _noSubmission: true, _extension }`
  // when the student hasn't submitted yet, or `{ ...submission, _extension }`
  // when they have. Normalise so `mySubmission` is either a real Submission or null.
  const mySubmission =
    rawMySubmission && !('_noSubmission' in rawMySubmission) ? rawMySubmission : null;
  // Extension is present in both cases.
  const myExtension = rawMySubmission?._extension ?? null;
  // Group info for GROUP-mode assignments (group name, members, leader status).
  const groupInfo = rawMySubmission?._groupInfo ?? null;
  const isGroupAssignment = a.workMode === 'GROUP';
  const isLeader = groupInfo?.isLeader === true;

  const now = new Date();
  const openAt = a.open_at ? new Date(a.open_at) : null;
  const baseDue = new Date(a.due_date);
  // Use the extension deadline if granted (student or group level).
  const extensionDue = myExtension?.newDueAt
    ? new Date(myExtension.newDueAt)
    : null;
  const due = extensionDue && extensionDue > baseDue ? extensionDue : baseDue;
  const hasExtension = extensionDue != null && extensionDue > baseDue;
  const notOpenYet = openAt != null && now < openAt;
  const closed = now > new Date(due.getTime() + (a.lateWindowMinutes ?? 0) * 60_000);

  // Resubmission allowed up to the (effective) deadline — the backend's
  // POST endpoint upserts so we can use the same submit UI for first-time
  // and resubmissions.
  const hasSubmitted = mySubmission != null;
  const isGraded = mySubmission?.is_reviewed === true && mySubmission?.grade != null;
  const passed = isGraded && (mySubmission?.grade ?? 0) >= 50; // soft pass threshold for color

  // "Due in X" countdown for the next non-closed assignment. We bucket
  // into days / hours so we don't show useless precision ("1d 4h 17m 42s").
  const msUntilDue = due.getTime() - now.getTime();
  const dueSoon = !closed && msUntilDue > 0 && msUntilDue < 48 * 60 * 60 * 1000;
  const dueSoonLabel = (() => {
    if (msUntilDue <= 0) return null;
    const hours = Math.floor(msUntilDue / (60 * 60 * 1000));
    if (hours < 1) return `in ${Math.max(1, Math.floor(msUntilDue / 60_000))}m`;
    if (hours < 24) return `in ${hours}h`;
    const days = Math.floor(hours / 24);
    return `in ${days}d`;
  })();

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error(`"${file.name}" exceeds the 25 MB limit`);
      e.target.value = '';
      return;
    }
    onPendingFileChange(file);
    e.target.value = '';
  };

  // Left accent bar colored by the student's standing on this assignment.
  const statusAccent = isGraded
    ? passed
      ? 'border-l-emerald-500'
      : 'border-l-rose-500'
    : hasSubmitted
      ? 'border-l-emerald-500'
      : closed
        ? 'border-l-rose-500'
        : dueSoon
          ? 'border-l-amber-500'
          : 'border-l-indigo-500';

  return (
    <div
      className={`rounded-lg border border-l-4 ${statusAccent} p-4 transition-shadow hover:shadow-sm`}
    >
      <div className='flex items-center justify-between mb-2 gap-2 flex-wrap'>
        <span className='font-medium truncate'>{a.title}</span>
        <div className='flex gap-1 flex-wrap'>
          {/* Submission status pill — semantic colors */}
          {isGraded ? (
            <Badge
              variant='outline'
              className={`gap-1 ${
                passed
                  ? 'text-success border-success'
                  : 'text-destructive border-destructive/40'
              }`}
            >
              <CheckCircle2 className='w-3 h-3' />
              Graded · {mySubmission.grade}%
            </Badge>
          ) : hasSubmitted ? (
            <Badge
              variant='success'
              className='gap-1'
            >
              <Check className='w-3 h-3' />
              Submitted
            </Badge>
          ) : closed ? (
            <Badge variant='destructive' className='gap-1'>
              <XIcon className='w-3 h-3' />
              Missed
            </Badge>
          ) : dueSoon ? (
            <Badge variant='destructive' className='gap-1'>
              <AlertTriangle className='w-3 h-3' />
              Due {dueSoonLabel}
            </Badge>
          ) : null}
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
        {openAt && <span>Opens: {format(openAt, 'MMM d, yyyy h:mm a')}</span>}
        <span>Due: {format(due, 'MMM d, yyyy h:mm a')}</span>
        {hasExtension && (
          <Badge variant='outline' className='text-[10px] gap-1 text-warning border-warning'>
            <CalendarClock className='w-3 h-3' />
            Extended from {format(baseDue, 'MMM d')}
          </Badge>
        )}
        <AddToCalendarButton
          deadline={{
            kind: 'assignment',
            id: a.id,
            title: a.title,
            description: a.description,
            due,
            courseOfferingPublicId,
          }}
          className='text-xs text-muted-foreground'
        />
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
                  {att.size >= 1024 * 1024
                    ? `${(att.size / (1024 * 1024)).toFixed(1)} MB`
                    : `${(att.size / 1024).toFixed(1)} KB`}
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

      {/* Group info card — shows group name, members, and leader for GROUP assignments */}
      {isGroupAssignment && groupInfo && (
        <div className='mt-3 border rounded-md bg-muted/20 px-3 py-2'>
          <div className='flex items-center gap-1.5 mb-1.5'>
            <Users className='w-3.5 h-3.5 text-muted-foreground' />
            <p className='text-xs font-medium'>{groupInfo.groupName}</p>
            {isLeader && (
              <Badge variant='outline' className='text-[10px] gap-0.5 text-amber-600 border-amber-300'>
                <Crown className='w-2.5 h-2.5' /> You are the leader
              </Badge>
            )}
          </div>
          <div className='flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground'>
            {groupInfo.members.map((m) => (
              <span key={m.id} className='inline-flex items-center gap-0.5'>
                {m.role === 'LEADER' && <Crown className='w-2.5 h-2.5 text-amber-500' />}
                {m.name}
              </span>
            ))}
          </div>
          {!isLeader && (
            <p className='text-[11px] text-muted-foreground mt-1.5'>
              Your group leader will submit on behalf of the group.
            </p>
          )}
        </div>
      )}
      {isGroupAssignment && !groupInfo && (
        <div className='mt-3 border rounded-md bg-destructive/5 px-3 py-2'>
          <p className='text-xs text-destructive'>
            You are not assigned to any group. Ask your teacher to add you to a group.
          </p>
        </div>
      )}

      {/* Your submission panel — only shown after the student has submitted.
          Surfaces the current submission URL, submission time, grade, and
          teacher feedback. If the assignment is still open the student can
          submit again (backend upserts in place). */}
      {hasSubmitted && (
        <div className='mt-3 border-l-2 border-primary/50 bg-primary/[0.03] rounded-r-md px-3 py-2 space-y-1.5'>
          <div className='flex items-center justify-between gap-2 flex-wrap'>
            <p className='text-xs font-medium'>
              {isGroupAssignment ? 'Group submission' : 'Your submission'}
            </p>
            <p className='text-[11px] text-muted-foreground tabular-nums'>
              {format(new Date(mySubmission.submitted_at), 'MMM d, h:mm a')}
              {mySubmission.is_late && (
                <span className='text-warning ml-1'>· late</span>
              )}
            </p>
          </div>
          {mySubmission.content_url && (
            <a
              href={mySubmission.content_url}
              target='_blank'
              rel='noreferrer'
              className='inline-flex items-center gap-1 text-xs text-primary hover:underline truncate max-w-full'
            >
              <LinkIcon className='w-3 h-3 shrink-0' />
              <span className='truncate'>{mySubmission.content_url}</span>
            </a>
          )}
          {isGraded && mySubmission.feedback && (
            <div className='mt-2 pt-2 border-t border-primary/20'>
              <p className='text-[11px] font-medium text-muted-foreground mb-0.5'>
                Teacher feedback
              </p>
              <p className='select-text text-xs whitespace-pre-wrap'>{mySubmission.feedback}</p>
            </div>
          )}
        </div>
      )}

      {/* Submit UI — shows when the window is open. For GROUP assignments
          only the leader can submit. Non-leaders see the group info card
          above with "Your leader will submit" message instead. */}
      {!notOpenYet && !closed && (!isGroupAssignment || isLeader) && (
        <div className='mt-3 space-y-2'>
          {hasSubmitted && (
            <p className='text-[11px] text-muted-foreground'>
              Submit a new version — this will <strong>replace</strong> your
              current submission and reset the grade.
            </p>
          )}
          {/* Link / File tabs */}
          <div className='inline-flex rounded-md border p-0.5 text-xs'>
            <button
              type='button'
              onClick={() => onSubmitModeChange('link')}
              className={`px-2.5 py-1 rounded transition-colors inline-flex items-center gap-1 ${
                submitMode === 'link'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LinkIcon className='w-3 h-3' /> Link
            </button>
            <button
              type='button'
              onClick={() => onSubmitModeChange('file')}
              className={`px-2.5 py-1 rounded transition-colors inline-flex items-center gap-1 ${
                submitMode === 'file'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Upload className='w-3 h-3' /> File
            </button>
          </div>
          <div className='flex gap-2'>
            {submitMode === 'link' ? (
              <Input
                placeholder='Paste a link to your work…'
                value={submitUrl}
                onChange={(e) => onSubmitUrlChange(e.target.value)}
              />
            ) : (
              <div className='flex-1 flex items-center gap-2'>
                <input
                  ref={fileInputRef}
                  type='file'
                  onChange={handlePickFile}
                  className='hidden'
                />
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='gap-1 shrink-0'
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className='w-3.5 h-3.5' /> Pick file
                </Button>
                {pendingFile ? (
                  <div className='flex items-center gap-2 text-xs min-w-0 flex-1'>
                    <span className='truncate'>{pendingFile.name}</span>
                    <span className='text-muted-foreground shrink-0'>
                      {pendingFile.size >= 1024 * 1024
                        ? `${(pendingFile.size / (1024 * 1024)).toFixed(1)} MB`
                        : `${(pendingFile.size / 1024).toFixed(1)} KB`}
                    </span>
                    <button
                      type='button'
                      onClick={() => onPendingFileChange(null)}
                      className='text-muted-foreground hover:text-destructive'
                      aria-label='Remove file'
                    >
                      <XIcon className='w-3 h-3' />
                    </button>
                  </div>
                ) : (
                  <span className='text-xs text-muted-foreground'>
                    No file selected · 25 MB max
                  </span>
                )}
              </div>
            )}
            <Button
              onClick={onSubmit}
              disabled={
                isSubmitting ||
                (submitMode === 'link' && !submitUrl.trim()) ||
                (submitMode === 'file' && !pendingFile)
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className='w-4 h-4 mr-1 animate-spin' />
                  Submitting…
                </>
              ) : hasSubmitted ? (
                'Resubmit'
              ) : (
                'Submit'
              )}
            </Button>
          </div>
        </div>
      )}
      {(notOpenYet || closed) && (
        <div className='mt-3'>
          <p className='text-xs text-muted-foreground'>
            {notOpenYet
              ? `Submissions open ${openAt ? format(openAt, 'MMM d, h:mm a') : 'soon'}.`
              : `Submissions closed${
                  (a.lateWindowMinutes ?? 0) > 0
                    ? ` ${a.lateWindowMinutes} min after the due date`
                    : ''
                }.`}
          </p>
        </div>
      )}
    </div>
  );
}

/// Course-wide rollup at the top of the student assignments view. Five
/// numbers that answer "where do I stand?" at a glance:
///   - average grade across all graded submissions
///   - submitted of total published
///   - graded count
///   - late count
///   - missing count (past due + never submitted)
/// Renders nothing when there are no assignments yet — saves an empty card
/// taking up space on an otherwise-empty tab.
function AssignmentsLoadingState({ isStudent }: { isStudent?: boolean }) {
  return isStudent ? (
    <div className='space-y-4'>
      <div className='rounded-xl border bg-card p-4 shadow-sm'>
        <div className='mb-3 h-4 w-28 animate-pulse rounded bg-muted/70' />
        <div className='grid grid-cols-2 gap-3 sm:grid-cols-5'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className='h-10 animate-pulse rounded bg-muted/50' />
          ))}
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className='overflow-hidden rounded-2xl border bg-card p-4 shadow-sm'>
          <div className='flex items-start justify-between gap-3'>
            <div className='h-4 w-1/2 animate-pulse rounded bg-muted/70' />
            <div className='h-6 w-20 animate-pulse rounded-full bg-muted/70' />
          </div>
          <div className='mt-3 h-3 w-5/6 animate-pulse rounded bg-muted/50' />
          <div className='mt-4 grid gap-2 sm:grid-cols-3'>
            <div className='h-10 animate-pulse rounded-xl bg-muted/50' />
            <div className='h-10 animate-pulse rounded-xl bg-muted/50' />
            <div className='h-10 animate-pulse rounded-xl bg-muted/50' />
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className='space-y-4'>
      <div className='overflow-hidden rounded-3xl border bg-card shadow-sm'>
        <div className='h-44 animate-pulse bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800' />
        <div className='grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className='h-20 animate-pulse rounded-2xl bg-muted/70' />
          ))}
        </div>
        <div className='border-t p-4 sm:p-6'>
          <div className='grid gap-3 lg:grid-cols-[1fr_360px]'>
            <div className='h-12 animate-pulse rounded-2xl bg-muted/60' />
            <div className='h-12 animate-pulse rounded-2xl bg-muted/60' />
          </div>
          <div className='mt-4 overflow-hidden rounded-3xl border bg-background'>
            <div className='h-12 animate-pulse border-b bg-muted/40' />
            <div className='space-y-2 p-4'>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className='h-12 animate-pulse rounded-2xl bg-muted/40' />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssignmentsEmptyState({
  isStudent,
  hasItems,
  onCreate
}: {
  isStudent?: boolean;
  hasItems: boolean;
  onCreate?: () => void;
}) {
  return (
    <div className='overflow-hidden rounded-3xl border bg-card shadow-sm'>
      <div className='bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-4 py-5 text-white sm:px-6'>
        <div className='flex items-center gap-2'>
          <ClipboardCheck className='size-4' />
          <p className='text-sm font-semibold'>Assignments</p>
        </div>
        <p className='mt-2 max-w-2xl text-sm text-white/75'>
          {isStudent
            ? 'When your instructor publishes work, the assignment workspace will show it here.'
            : 'Use the assignment workspace to publish, filter, and grade coursework for this section.'}
        </p>
      </div>
      <div className='flex flex-col items-center justify-center px-6 py-12 text-center'>
        <div className='mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground'>
          <ClipboardCheck className='size-6' />
        </div>
        <h3 className='text-lg font-semibold tracking-tight'>
          {hasItems ? 'No matching assignments' : 'No assignments yet'}
        </h3>
        <p className='mt-2 max-w-md text-sm text-muted-foreground'>
          {hasItems
            ? 'Try a different filter or search term to surface more work.'
            : isStudent
              ? "Your teacher hasn't posted any work for this course yet."
              : 'Create the first assignment to start tracking submissions and grades.'}
        </p>
        {!isStudent && !hasItems && onCreate && (
          <Button className='mt-5 gap-1.5' onClick={onCreate}>
            <Plus className='size-4' /> Create assignment
          </Button>
        )}
      </div>
    </div>
  );
}

function StudentSummaryCard({ courseId }: { courseId: string }) {
  const { data } = useMyAssignmentSummary(courseId);
  if (!data || data.totalPublished === 0) return null;

  const avgText =
    data.avgGrade == null
      ? 'text-muted-foreground'
      : data.avgGrade >= 80
        ? 'text-emerald-600 dark:text-emerald-400'
        : data.avgGrade >= 60
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-rose-600 dark:text-rose-400';

  return (
    <div className='rounded-xl border bg-card p-4 shadow-sm'>
      <div className='mb-3 flex items-center justify-between gap-2'>
        <h3 className='text-sm font-medium'>Your progress</h3>
        {data.missingCount > 0 ? (
          <span className='text-xs text-muted-foreground'>{data.missingCount} overdue</span>
        ) : null}
      </div>

      <div className='grid grid-cols-2 gap-3 text-sm sm:grid-cols-5'>
        <div>
          <p className='text-xs text-muted-foreground'>Avg grade</p>
          <p className={cn('font-semibold tabular-nums', avgText)}>
            {data.avgGrade != null ? `${data.avgGrade}%` : '—'}
          </p>
        </div>
        <div>
          <p className='text-xs text-muted-foreground'>Submitted</p>
          <p className='font-semibold tabular-nums'>
            {data.submittedCount}
            <span className='font-normal text-muted-foreground'> / {data.totalPublished}</span>
          </p>
        </div>
        <div>
          <p className='text-xs text-muted-foreground'>Graded</p>
          <p className='font-semibold tabular-nums'>{data.gradedCount}</p>
        </div>
        <div>
          <p className='text-xs text-muted-foreground'>Late</p>
          <p className='font-semibold tabular-nums'>{data.lateCount}</p>
        </div>
        <div>
          <p className='text-xs text-muted-foreground'>Missing</p>
          <p className='font-semibold tabular-nums'>{data.missingCount}</p>
        </div>
      </div>
    </div>
  );
}