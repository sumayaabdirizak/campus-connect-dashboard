'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  ArrowLeft,
  BarChart3,
  Check,
  Download,
  Eye,
  Loader2,
  Search,
  ShieldAlert,
  Square
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { AttemptGrader } from './attempt-grader';
import { QuizLiveMonitor } from './quiz-live-monitor';
import { ListSkeleton } from './_shared/list-skeleton';
import { QuizAnalyticsView } from './quiz-analytics-view';
import { useQuizAttempts } from '../api/quizzes-queries';
import { useRoster } from '../api/roster-queries';
import type { Quiz, QuizAttempt } from '../api/quizzes-types';

export function TeacherAttemptsPanel({
  quiz,
  courseId,
  onBack
}: {
  quiz: Quiz;
  courseId: string;
  onBack: () => void;
}) {
  const { data: attempts = [], isLoading } = useQuizAttempts(quiz.id);
  const { data: roster = [] } = useRoster(courseId);
  const [grading, setGrading] = useState<QuizAttempt | null>(null);
  const [tab, setTab] = useState<'attempts' | 'analytics'>('attempts');
  // Status filter pill — mirrors the teacher's mental model. "Not started"
  // is computed from the roster: enrolled students with zero attempts.
  type StatusFilter = 'all' | 'submitted' | 'in_progress' | 'not_started';
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  // The grader fetches `attempt.answers` from this same list query — when
  // useGradeAttempt invalidates the list after save, the new row replaces
  // the stale prop here so the grader rehydrates with the latest grades.
  const liveGrading = grading
    ? attempts.find((a) => a.id === grading.id) ?? grading
    : null;

  if (liveGrading) {
    return (
      <AttemptGrader
        attempt={liveGrading}
        courseOfferingId={courseId}
        quizId={quiz.id}
        onBack={() => setGrading(null)}
      />
    );
  }

  /// An attempt "needs grading" iff at least one short-answer row hasn't
  /// been scored (is_correct is null). MCQ-only quizzes never enter this
  /// state because they're scored at submit time.
  const needsGrading = (a: QuizAttempt) =>
    (a.answers ?? []).some(
      (ans) => ans.question?.question_type === 'SHORT_ANSWER' && ans.is_correct == null
    );

  const pendingCount = attempts.filter(needsGrading).length;

  // Build the full table model: every enrolled student + their most recent
  // attempt (or null for "Not started"). Shape mirrors `SubmissionRow` in
  // course-assignments.tsx — teachers expect to see the full class roster,
  // not just submitters. Most-recent-attempt wins so a student who started
  // a second attempt after submitting their first one shows the latest state.
  type AttemptRow = {
    studentId: number;
    student: { id: number; full_name: string; number?: string; email?: string };
    attempt: QuizAttempt | null;
  };
  const attemptByStudent = (() => {
    const m = new Map<number, QuizAttempt>();
    for (const a of attempts) {
      const prev = m.get(a.studentId);
      // Prefer most-recently-started; fall back to first seen.
      if (!prev || new Date(a.started_at) > new Date(prev.started_at)) {
        m.set(a.studentId, a);
      }
    }
    return m;
  })();
  const allRows: AttemptRow[] = roster.map((rs) => ({
    studentId: rs.id,
    student: { id: rs.id, full_name: rs.full_name, number: rs.number, email: rs.email },
    attempt: attemptByStudent.get(rs.id) ?? null,
  }));

  // Status classifier — drives both the filter pill counts and the per-row
  // Status badge. "in_progress" = attempt row exists with no `submitted_at`.
  const rowStatus = (row: AttemptRow): 'submitted' | 'in_progress' | 'not_started' => {
    if (!row.attempt) return 'not_started';
    return row.attempt.submitted_at ? 'submitted' : 'in_progress';
  };

  const filteredRows = allRows
    .filter((r) => statusFilter === 'all' || rowStatus(r) === statusFilter)
    .filter((r) => {
      if (!search.trim()) return true;
      const needle = search.toLowerCase();
      return (
        r.student.full_name.toLowerCase().includes(needle) ||
        (r.student.number ?? '').toLowerCase().includes(needle) ||
        (r.student.email ?? '').toLowerCase().includes(needle)
      );
    });

  // CSV export — one row per enrolled student (NOT just submitters) so the
  // teacher can paste into a gradebook and see everyone's status. Same
  // structure as `downloadGradeCsv` in course-assignments.tsx. Generated
  // client-side because the backend doesn't need the data and the export
  // is fast for any realistic class size.
  const downloadAttemptsCsv = () => {
    const header = [
      'Student',
      'Student ID',
      'Email',
      'Status',
      'Started At',
      'Submitted At',
      'Score (%) — latest attempt',
      'Violations',
      'Closure Reason',
    ];
    const rows = allRows.map(({ student, attempt }) => {
      const status = !attempt
        ? 'not_started'
        : attempt.submitted_at
          ? 'submitted'
          : 'in_progress';
      return [
        student.full_name,
        student.number ?? '',
        student.email ?? '',
        status,
        attempt?.started_at ? format(new Date(attempt.started_at), 'yyyy-MM-dd HH:mm') : '',
        attempt?.submitted_at ? format(new Date(attempt.submitted_at), 'yyyy-MM-dd HH:mm') : '',
        attempt?.score != null ? String(Math.round(attempt.score)) : '',
        attempt?.violations_count != null ? String(attempt.violations_count) : '',
        attempt?.closure_reason ?? '',
      ];
    });
    // CSV-cell escaper with formula-injection guard. Beyond the usual
    // quote-doubling, a cell that *starts* with =, +, -, @ (or a tab/CR) is
    // executed as a formula by Excel / Sheets — a student named `=cmd|…` would
    // run on open. Prefix those with a single quote so the spreadsheet treats
    // the whole cell as text. The leading `'` is invisible once rendered.
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
    a.download = `${quiz.title.replace(/[^a-z0-9]/gi, '_')}_attempts.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Counts for the filter pills.
  const counts = {
    all: allRows.length,
    submitted: allRows.filter((r) => rowStatus(r) === 'submitted').length,
    in_progress: allRows.filter((r) => rowStatus(r) === 'in_progress').length,
    not_started: allRows.filter((r) => rowStatus(r) === 'not_started').length,
  };

  return (
    <div className='space-y-3'>
      <Button variant='ghost' onClick={onBack} className='gap-1'>
        <ArrowLeft className='w-4 h-4' /> Back
      </Button>
      <div className='flex items-center justify-between gap-2 flex-wrap'>
        <div className='flex items-center gap-2 flex-wrap'>
          <h3 className='font-bold text-lg'>{quiz.title}</h3>
          {pendingCount > 0 && tab === 'attempts' && (
            <Badge variant='destructive'>{pendingCount} need grading</Badge>
          )}
        </div>
        <SegmentedControl
          ariaLabel='Attempts or analytics view'
          value={tab}
          onChange={setTab}
          options={[
            { value: 'attempts', label: 'Attempts' },
            { value: 'analytics', label: (<span className='inline-flex items-center gap-1'><BarChart3 className='w-3 h-3' />Analytics</span>) }
          ]}
        />
      </div>

      {tab === 'analytics' ? (
        <QuizAnalyticsView quizId={quiz.id} />
      ) : (
        <>
          {/* Live monitor — collapsible WebSocket-powered dashboard showing
              students currently taking the quiz. Sits above the historical
              table so the teacher sees in-flight activity first. */}
          <QuizLiveMonitor quizId={quiz.id} />

          {/* Filter pills + search + CSV export. Sits above the table to
              match the design and to mirror the assignment submissions view
              for cross-tab consistency. Counts use `tabular-nums` so the
              numbers stay aligned as the filters change. */}
          <div className='flex flex-wrap items-center gap-2'>
            <SegmentedControl
              ariaLabel='Filter attempts by status'
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All', count: counts.all },
                { value: 'submitted', label: 'Submitted', count: counts.submitted },
                { value: 'in_progress', label: 'In progress', count: counts.in_progress },
                { value: 'not_started', label: 'Not started', count: counts.not_started }
              ]}
            />
            <div className='relative flex-1 min-w-[200px] max-w-xs'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
              <Input
                placeholder='Search student…'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='pl-10 h-8'
              />
            </div>
            <Button
              variant='outline'
              size='sm'
              className='gap-1 ml-auto'
              onClick={downloadAttemptsCsv}
            >
              <Download className='w-4 h-4' /> Export CSV
            </Button>
          </div>

          {isLoading && <ListSkeleton variant='row' count={3} />}
          <div className='overflow-hidden rounded-lg border bg-card shadow-sm'>
            <div className='max-h-[min(640px,calc(100dvh-18rem))] overflow-auto overscroll-contain'>
              <Table className='min-w-[880px]'>
                <TableHeader className='sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85'>
                  <TableRow className='hover:bg-transparent border-b [&>th]:h-10 [&>th]:px-3 [&>th]:text-[11px] [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground'>
                    <TableHead>Student</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Monitoring</TableHead>
                    <TableHead className='text-right'>Score</TableHead>
                    <TableHead className='w-px' />
                  </TableRow>
                </TableHeader>
                <TableBody>
                {filteredRows.map((row) => {
                  const { studentId, student, attempt } = row;
                  const status = rowStatus(row);
                  const pending = attempt ? needsGrading(attempt) : false;
                  const isAutoSubmit = attempt?.closure_reason === 'time_expired';
                  const closedForViolations = attempt?.closure_reason === 'violations';
                  const violations = attempt?.violations_count ?? 0;
                  return (
                    <TableRow
                      key={studentId}
                      className={`${attempt ? 'cursor-pointer hover:bg-muted/30' : 'opacity-60'}`}
                      onClick={() => attempt && setGrading(attempt)}
                    >
                      <TableCell>
                        <div className='flex flex-col gap-0.5'>
                          <span className='font-medium'>{student.full_name}</span>
                          {student.number && (
                            <span className='text-[11px] text-muted-foreground tabular-nums'>
                              {student.number}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className='text-muted-foreground'>
                        {attempt?.started_at
                          ? format(new Date(attempt.started_at), 'MMM d, h:mm a')
                          : <span className='text-xs'>—</span>}
                      </TableCell>
                      <TableCell className='text-muted-foreground'>
                        {attempt?.submitted_at
                          ? format(new Date(attempt.submitted_at), 'MMM d, h:mm a')
                          : <span className='text-xs'>—</span>}
                      </TableCell>
                      <TableCell>
                        {/* Status badge — green/amber/gray maps to the design.
                            Auto-submit / violations callouts ride along as a
                            sub-badge so the teacher can spot abnormal closures
                            without leaving the row. */}
                        <div className='flex flex-wrap gap-1'>
                          <Badge
                            variant='outline'
                            className={`text-[10px] gap-1 capitalize ${
                              status === 'submitted'
                                ? 'text-success border-success'
                                : status === 'in_progress'
                                  ? 'text-warning border-warning'
                                  : 'text-muted-foreground'
                            }`}
                          >
                            {status === 'submitted' && <Check className='w-3 h-3' />}
                            {status === 'in_progress' && <Loader2 className='w-3 h-3' />}
                            {status === 'not_started' && <Square className='w-3 h-3' />}
                            {status.replace('_', ' ')}
                          </Badge>
                          {isAutoSubmit && (
                            <Badge variant='outline' className='text-[10px]'>
                              Time expired
                            </Badge>
                          )}
                          {closedForViolations && (
                            <Badge variant='destructive' className='text-[10px]'>
                              Auto-closed
                            </Badge>
                          )}
                          {pending && (
                            <Badge variant='destructive' className='text-[10px]'>
                              Needs grading
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {/* Monitoring column — surfaces violations_count.
                            Hovering shows the closure reason if any. We use a
                            destructive-tinted pill for any non-zero count so
                            it stands out without dominating clean rows. */}
                        {violations > 0 ? (
                          <Badge
                            variant='outline'
                            className='gap-1 text-[10px] text-destructive border-destructive/40'
                            title={
                              closedForViolations
                                ? 'Quiz auto-closed for violations'
                                : `${violations} monitoring event${violations === 1 ? '' : 's'}`
                            }
                          >
                            <ShieldAlert className='w-3 h-3' />
                            {violations} violation{violations === 1 ? '' : 's'}
                          </Badge>
                        ) : (
                          <span className='text-xs text-muted-foreground'>clean</span>
                        )}
                      </TableCell>
                      <TableCell className='text-right tabular-nums'>
                        {attempt?.score != null
                          ? `${Math.round(attempt.score)}%`
                          : <span className='text-xs text-muted-foreground'>—</span>}
                      </TableCell>
                      <TableCell className='text-right pr-2'>
                        {attempt ? (
                          <Button
                            variant='ghost'
                            size='sm'
                            className='gap-1'
                            onClick={(e) => {
                              e.stopPropagation();
                              setGrading(attempt);
                            }}
                          >
                            <Eye className='w-3.5 h-3.5' />
                            {pending ? 'Grade' : 'Review'}
                          </Button>
                        ) : (
                          <span className='text-xs text-muted-foreground pr-3'>—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!isLoading && filteredRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className='text-center text-sm text-muted-foreground py-8'>
                      {search.trim() || statusFilter !== 'all'
                        ? 'No students match your filters.'
                        : roster.length === 0
                          ? 'No students enrolled yet.'
                          : 'No attempts yet.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}