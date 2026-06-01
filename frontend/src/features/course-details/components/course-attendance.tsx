'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, QrCode, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useAuthStore } from '@/lib/auth-store';
import { QrAttendanceHost } from './qr-attendance-host';
import { QrAttendanceScanner } from './qr-attendance-scanner';
import {
  useAttendanceSummary,
  useCreateSession,
  useDeleteSession,
  useRecords,
  useSessions,
  useUpsertRecord
} from '../api/attendance-queries';
import { useRoster } from '../api/roster-queries';
import type { AttendanceRecord, ClassSchedule } from '../api/attendance-types';
import { ListSkeleton } from './_shared/list-skeleton';
import { AttendanceSessionForm } from './attendance-session-form';
import type { AttendanceSessionFormValues } from '../schemas/attendance-session';

interface CourseAttendanceProps {
  courseId: string;
  isStudent?: boolean;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const STATUSES = ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] as const;
type Status = (typeof STATUSES)[number];

function statusVariant(status: Status) {
  if (status === 'PRESENT') return 'default' as const;
  if (status === 'LATE') return 'outline' as const;
  if (status === 'ABSENT') return 'destructive' as const;
  return 'secondary' as const;
}

export function CourseAttendance({ courseId, isStudent }: CourseAttendanceProps) {
  const { user } = useAuthStore();
  const userId = typeof user?.id === 'number' ? user.id : Number(user?.id ?? 0);

  const [search, setSearch] = useState('');
  const [hostingSchedule, setHostingSchedule] = useState<ClassSchedule | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ClassSchedule | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  // The new-session form's local field state is owned by `AttendanceSessionForm`
  // (TanStack Form + Zod). We only track dialog open/close here.

  const { data: sessions = [], isLoading: sessionsLoading } = useSessions(courseId);
  const { data: summary } = useAttendanceSummary(courseId);
  const { data: roster = [] } = useRoster(courseId);
  const createSessionMutation = useCreateSession(courseId);
  const deleteSessionMutation = useDeleteSession(courseId);
  const upsertRecord = useUpsertRecord(courseId);

  const { data: sessionRecords = [], isLoading: recordsLoading } = useRecords(
    courseId,
    selectedSession ? { scheduleId: String(selectedSession.id) } : undefined
  );
  const { data: myRecords = [] } = useRecords(
    courseId,
    isStudent && userId ? { studentId: String(userId) } : undefined
  );

  const totalSessions = summary?.totalSessions ?? sessions.length;
  const avgRatePct = summary?.avgRatePct ?? 0;
  const perStudent = summary?.students ?? [];

  const filtered = useMemo(
    () =>
      sessions.filter(
        (s) =>
          s.location.toLowerCase().includes(search.toLowerCase()) ||
          (s.topic ?? '').toLowerCase().includes(search.toLowerCase())
      ),
    [sessions, search]
  );

  // Called by AttendanceSessionForm once Zod has accepted the values. We
  // no longer hand-validate `location` here — the schema's `min(1)` rule
  // covers it and surfaces the error inline next to the input.
  const handleCreateSession = (values: AttendanceSessionFormValues) => {
    createSessionMutation.mutate(values, {
      onSuccess: () => {
        toast.success('Session created');
        setCreateOpen(false);
      },
      onError: (e: Error) => toast.error(e.message)
    });
  };

  const handleDeleteSession = (scheduleId: number) => {
    if (!confirm('Delete this session?')) return;
    deleteSessionMutation.mutate(String(scheduleId), {
      onSuccess: () => {
        toast.success('Session deleted');
        setSelectedSession(null);
      },
      onError: (e: Error) => toast.error(e.message)
    });
  };

  const handleSetStatus = (studentId: number, status: Status, existing?: AttendanceRecord) => {
    if (!selectedSession) return;
    upsertRecord.mutate(
      existing
        ? { recordId: existing.id, update: { status } }
        : { create: { scheduleId: selectedSession.id, studentId, status } },
      { onError: (e: Error) => toast.error(e.message) }
    );
  };

  // ── Records view (teacher) ─────────────────────────────────────────────
  if (selectedSession) {
    const recordsByStudent = new Map<number, AttendanceRecord>();
    for (const r of sessionRecords) recordsByStudent.set(r.studentId, r);

    return (
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <Button variant='ghost' onClick={() => setSelectedSession(null)} className='gap-1'>
            <ArrowLeft className='w-4 h-4' /> Back
          </Button>
          <Button
            variant='ghost'
            size='sm'
            className='text-destructive gap-1'
            onClick={() => handleDeleteSession(selectedSession.id)}
          >
            <Trash2 className='w-4 h-4' /> Delete session
          </Button>
        </div>
        <div>
          <h2 className='text-xl font-bold'>
            {selectedSession.topic ?? selectedSession.location}
          </h2>
          <p className='text-sm text-muted-foreground'>
            {DAY_NAMES[selectedSession.day_of_week]} · {selectedSession.start_time}–
            {selectedSession.end_time} · {selectedSession.location}
          </p>
        </div>

        {recordsLoading && <ListSkeleton variant='row' count={4} />}

        <div className='border rounded-lg overflow-hidden'>
          <Table>
            <TableHeader className='bg-muted/30'>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='text-right'>Set</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.map((s) => {
                const existing = recordsByStudent.get(s.id);
                const currentStatus = (existing?.status ?? 'ABSENT') as Status;
                return (
                  <TableRow key={s.id}>
                    <TableCell className='font-medium'>{s.full_name}</TableCell>
                    <TableCell>{s.number}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(currentStatus)}>{currentStatus}</Badge>
                    </TableCell>
                    <TableCell className='text-right'>
                      <Select
                        value={currentStatus}
                        onValueChange={(v) => handleSetStatus(s.id, v as Status, existing)}
                      >
                        <SelectTrigger className='h-8 w-32 ml-auto text-xs'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((st) => (
                            <SelectItem key={st} value={st}>
                              {st}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // ── Student view ───────────────────────────────────────────────────────
  if (isStudent) {
    const myRate = perStudent.find((s) => s.studentId === userId)?.ratePct ?? 0;
    return (
      <div className='space-y-4'>
        <div className='flex items-center justify-between gap-3'>
          <Card className='flex-1'>
            <CardContent className='p-4'>
              <p className='text-sm text-muted-foreground'>Your attendance</p>
              <p className='text-2xl font-bold'>{myRate}%</p>
            </CardContent>
          </Card>
          <Button onClick={() => setScanOpen(true)} className='gap-1'>
            <QrCode className='w-4 h-4' /> Scan attendance
          </Button>
        </div>
        {myRecords.length === 0 ? (
          <p className='text-sm text-muted-foreground'>No attendance records yet.</p>
        ) : (
          <div className='space-y-2'>
            {myRecords.map((r) => (
              <div key={r.id} className='border rounded-lg p-3 flex items-center justify-between'>
                <div>
                  <p className='font-medium'>{r.schedule?.location ?? '—'}</p>
                  <p className='text-xs text-muted-foreground'>
                    {r.schedule?.start_time}–{r.schedule?.end_time}
                  </p>
                </div>
                <Badge variant={statusVariant(r.status as Status)}>{r.status}</Badge>
              </div>
            ))}
          </div>
        )}

        <Dialog open={scanOpen} onOpenChange={setScanOpen}>
          <DialogContent className='max-w-md'>
            <DialogHeader className='sr-only'>
              <DialogTitle>Scan Attendance</DialogTitle>
            </DialogHeader>
            <QrAttendanceScanner onClose={() => setScanOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Teacher overview view ──────────────────────────────────────────────
  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-3 gap-3'>
        <Card>
          <CardContent className='p-3'>
            <p className='text-xs text-muted-foreground'>Sessions</p>
            <p className='text-xl font-bold'>{totalSessions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-3'>
            <p className='text-xs text-muted-foreground'>Average rate</p>
            <p className='text-xl font-bold text-success'>{avgRatePct}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-3'>
            <p className='text-xs text-muted-foreground'>Students</p>
            <p className='text-xl font-bold text-info'>{perStudent.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className='flex gap-2'>
        <Input
          placeholder='Search sessions...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='max-w-xs'
        />
        <Button onClick={() => setCreateOpen(true)} variant='outline' className='gap-1'>
          <Plus className='w-4 h-4' /> New session
        </Button>
      </div>

      {sessionsLoading && <p className='text-sm text-muted-foreground'>Loading sessions…</p>}
      {!sessionsLoading && filtered.length === 0 && (
        <div className='border border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground'>
          No sessions scheduled yet.
        </div>
      )}

      {filtered.length > 0 && (
        <div className='border rounded-lg overflow-hidden'>
          <Table>
            <TableHeader className='bg-muted/30'>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead className='text-right'>Attended</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell
                    className='font-medium cursor-pointer'
                    onClick={() => setSelectedSession(s)}
                  >
                    {DAY_NAMES[s.day_of_week]}
                  </TableCell>
                  <TableCell
                    className='cursor-pointer'
                    onClick={() => setSelectedSession(s)}
                  >
                    {s.start_time}–{s.end_time}
                  </TableCell>
                  <TableCell
                    className='cursor-pointer'
                    onClick={() => setSelectedSession(s)}
                  >
                    {s.location}
                    {s.is_lab && (
                      <Badge variant='outline' className='ml-2 text-[10px]'>
                        Lab
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell
                    className='text-muted-foreground cursor-pointer'
                    onClick={() => setSelectedSession(s)}
                  >
                    {s.topic ?? '—'}
                  </TableCell>
                  <TableCell
                    className='text-right text-success cursor-pointer'
                    onClick={() => setSelectedSession(s)}
                  >
                    {s._count?.attendance ?? s.attendance?.length ?? 0}
                  </TableCell>
                  <TableCell className='text-right'>
                    <Button
                      variant='outline'
                      size='sm'
                      className='gap-1'
                      onClick={(e) => {
                        e.stopPropagation();
                        setHostingSchedule(s);
                      }}
                    >
                      <QrCode className='w-3.5 h-3.5' /> Start
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {perStudent.length > 0 && (
        <div className='border rounded-lg overflow-hidden'>
          <div className='px-4 py-2 bg-muted/30 text-sm font-medium'>
            Per-student attendance rate
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>ID</TableHead>
                <TableHead className='text-right'>Present</TableHead>
                <TableHead className='text-right'>Late</TableHead>
                <TableHead className='text-right'>Absent</TableHead>
                <TableHead className='text-right'>Excused</TableHead>
                <TableHead className='text-right'>Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perStudent.map((s) => (
                <TableRow key={s.studentId}>
                  <TableCell className='font-medium'>{s.full_name}</TableCell>
                  <TableCell className='text-muted-foreground'>{s.number}</TableCell>
                  <TableCell className='text-right text-success'>{s.present}</TableCell>
                  <TableCell className='text-right'>{s.late}</TableCell>
                  <TableCell className='text-right text-destructive'>{s.absent}</TableCell>
                  <TableCell className='text-right'>{s.excused}</TableCell>
                  <TableCell className='text-right'>
                    <Badge
                      variant={
                        s.ratePct >= 80 ? 'default' : s.ratePct >= 60 ? 'outline' : 'destructive'
                      }
                    >
                      {s.ratePct}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>New session</DialogTitle>
          </DialogHeader>
          {/* All field state + Zod validation lives inside this component. */}
          <AttendanceSessionForm
            onSubmit={handleCreateSession}
            onCancel={() => setCreateOpen(false)}
            submitting={createSessionMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!hostingSchedule}
        onOpenChange={(o) => !o && setHostingSchedule(null)}
      >
        <DialogContent className='max-w-md'>
          <DialogHeader className='sr-only'>
            <DialogTitle>QR Attendance</DialogTitle>
          </DialogHeader>
          <QrAttendanceHost
            schedule={hostingSchedule}
            onClose={() => setHostingSchedule(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
