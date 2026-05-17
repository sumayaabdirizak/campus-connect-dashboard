'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search,
  Plus,
  QrCode,
  Calendar,
  Clock,
  CheckCircle,
  Camera,
  X,
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
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
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';

interface CourseAttendanceProps {
  courseId: string;
  isStudent?: boolean;
}

const sessions = [
  {
    id: 's1',
    date: new Date(),
    time: '09:00 AM',
    location: 'Lecture 12',
    scansCount: 28,
    total: 32,
    status: 'closed'
  },
  {
    id: 's2',
    date: new Date(Date.now() - 86400000),
    time: '11:00 AM',
    location: 'Lecture 11',
    scansCount: 31,
    total: 32,
    status: 'closed'
  },
  {
    id: 's3',
    date: new Date(Date.now() - 172800000),
    time: '09:00 AM',
    location: 'Lecture 10',
    scansCount: 30,
    total: 32,
    status: 'closed'
  }
];

const records = [
  {
    id: 'r1',
    studentName: 'Ahmed Ali',
    studentId: '20210001',
    scannedAt: new Date(),
    status: 'present',
    ipAddress: '192.168.1.1'
  },
  {
    id: 'r2',
    studentName: 'Sara Smith',
    studentId: '20210005',
    scannedAt: new Date(),
    status: 'late',
    ipAddress: '192.168.1.2'
  },
  {
    id: 'r3',
    studentName: 'John Doe',
    studentId: '20210010',
    scannedAt: null,
    status: 'absent',
    ipAddress: '-'
  }
];

export function CourseAttendance({ courseId, isStudent }: CourseAttendanceProps) {
  const [view, setView] = useState('sessions');
  const [search, setSearch] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const [countdown, setCountdown] = useState(600);
  const [selectedSession, setSelectedSession] = useState<any>(null);

  const filtered = sessions.filter((s) => s.location.toLowerCase().includes(search.toLowerCase()));
  const totalPresent = sessions.reduce((acc, s) => acc + s.scansCount, 0);
  const avgAttendance = Math.round((totalPresent / (sessions.length * 32)) * 100);

  useEffect(() => {
    if (!qrOpen) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [qrOpen]);

  const handleStartQR = () => {
    setQrOpen(true);
    setCountdown(600);
    toast.success('Attendance session started');
  };

  const handleStopQR = () => {
    setQrOpen(false);
    toast.success('Attendance session ended');
  };

  const openRecords = (session: any) => {
    setSelectedSession(session);
    setView('records');
  };

  const formatTime = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  if (view === 'records') {
    return (
      <div className='space-y-4'>
        <Button variant='ghost' onClick={() => setView('sessions')} className='gap-1'>
          <ArrowLeft className='w-4 h-4' /> Back
        </Button>
        <div>
          <h2 className='text-xl font-bold'>{selectedSession?.location}</h2>
          <p className='text-sm text-muted-foreground'>
            {selectedSession && format(selectedSession.date, 'MMMM d, yyyy')} •{' '}
            {selectedSession?.time}
          </p>
        </div>
        <div className='border rounded-lg overflow-hidden'>
          <Table>
            <TableHeader className='bg-muted/30'>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className='font-medium'>{r.studentName}</TableCell>
                  <TableCell>{r.studentId}</TableCell>
                  <TableCell>{r.scannedAt ? format(r.scannedAt, 'h:mm:ss a') : '-'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === 'present'
                          ? 'default'
                          : r.status === 'late'
                            ? 'outline'
                            : 'secondary'
                      }
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (isStudent) {
    return (
      <div className='space-y-4'>
        <Card>
          <CardContent className='p-4'>
            <p className='text-sm text-muted-foreground'>Your Attendance</p>
            <p className='text-2xl font-bold'>{avgAttendance}%</p>
          </CardContent>
        </Card>
        <div className='space-y-2'>
          {sessions.map((s) => (
            <div key={s.id} className='border rounded-lg p-3 flex items-center justify-between'>
              <div>
                <p className='font-medium'>{s.location}</p>
                <p className='text-xs text-muted-foreground'>{format(s.date, 'MMM d, yyyy')}</p>
              </div>
              <Badge variant='default'>Present</Badge>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-3 gap-3'>
        <Card>
          <CardContent className='p-3'>
            <p className='text-xs text-muted-foreground'>Sessions</p>
            <p className='text-xl font-bold'>{sessions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-3'>
            <p className='text-xs text-muted-foreground'>Average</p>
            <p className='text-xl font-bold text-emerald-600'>{avgAttendance}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-3'>
            <p className='text-xs text-muted-foreground'>Scans</p>
            <p className='text-xl font-bold text-blue-600'>{totalPresent}</p>
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
        <Button onClick={handleStartQR} className='gap-1'>
          <QrCode className='w-4 h-4' /> Start Attendance
        </Button>
      </div>

      <div className='border rounded-lg overflow-hidden'>
        <Table>
          <TableHeader className='bg-muted/30'>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Scans</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id} className='cursor-pointer' onClick={() => openRecords(s)}>
                <TableCell className='font-medium'>{s.location}</TableCell>
                <TableCell>{format(s.date, 'MMM d, yyyy')}</TableCell>
                <TableCell>{s.time}</TableCell>
                <TableCell className='text-emerald-600'>{s.scansCount}</TableCell>
                <TableCell>
                  <Badge variant='default'>{s.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className='max-w-sm text-center'>
          <DialogHeader>
            <div className='mx-auto w-32 h-32 bg-slate-900 rounded-xl flex items-center justify-center mb-2'>
              <QrCode className='w-20 h-20 text-white' />
            </div>
            <DialogTitle>Scanning Attendance</DialogTitle>
          </DialogHeader>
          <p className='text-4xl font-bold text-primary'>{formatTime(countdown)}</p>
          <p className='text-xs text-muted-foreground'>Session will auto-close when timer ends</p>
          <DialogFooter className='flex justify-center'>
            <Button variant='outline' onClick={handleStopQR} className='w-full'>
              Stop Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
