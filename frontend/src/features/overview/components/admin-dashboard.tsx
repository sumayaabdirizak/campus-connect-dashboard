'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Users,
  GraduationCap,
  UserCheck,
  BookOpen,
  Layers,
  ClipboardList,
  UsersRound,
  Megaphone,
  Bell,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useDeanUsers, usePendingRegistrations } from '@/features/dean/api/queries';
import { useAnnouncements } from '@/features/announcements/api/queries';
import { MonthCalendar } from './month-calendar';

const SHORTCUTS: { icon: LucideIcon; title: string; desc: string; href: string }[] = [
  { icon: Users, title: 'Users', desc: 'Students, teachers & staff', href: '/dashboard/dean/users' },
  { icon: BookOpen, title: 'Courses', desc: 'Catalog & offerings', href: '/dashboard/dean/courses' },
  { icon: Layers, title: 'Batches', desc: 'Batches & sections', href: '/dashboard/dean/batches' },
  {
    icon: ClipboardList,
    title: 'Teacher assigning',
    desc: 'Assign teachers to sections',
    href: '/dashboard/dean/Assigning'
  },
  { icon: UsersRound, title: 'Clubs', desc: 'Student clubs', href: '/dashboard/dean/clubs' },
  {
    icon: Megaphone,
    title: 'Announcements',
    desc: 'Publish & schedule',
    href: '/dashboard/announcements'
  }
];

function AdminStat({
  icon: Icon,
  value,
  label,
  href,
  loading,
  accent
}: {
  icon: LucideIcon;
  value: number;
  label: string;
  href: string;
  loading?: boolean;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className='flex items-center gap-3 rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg',
          accent ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        )}
      >
        <Icon className='size-5' />
      </span>
      <div className='min-w-0'>
        {loading ? (
          <Skeleton className='h-7 w-10' />
        ) : (
          <p className='text-2xl font-bold tabular-nums text-foreground'>{value}</p>
        )}
        <p className='text-xs text-muted-foreground'>{label}</p>
      </div>
    </Link>
  );
}

export function AdminDashboard({ user }: { user: { full_name?: string } }) {
  const { data: students, isLoading: studentsLoading } = useDeanUsers({
    role: 'STUDENT',
    pageSize: '1'
  });
  const { data: teachers, isLoading: teachersLoading } = useDeanUsers({
    role: 'TEACHER',
    pageSize: '1'
  });
  const { data: pending, isLoading: pendingLoading } = usePendingRegistrations();
  const { data: announcementsData } = useAnnouncements();

  const announcements = announcementsData ?? [];
  const studentCount = students?.pagination?.total ?? 0;
  const teacherCount = teachers?.pagination?.total ?? 0;
  const pendingCount = pending?.registrations?.length ?? 0;
  const firstName = user?.full_name?.split(' ')[0];

  return (
    <div className='flex-1 space-y-6'>
      {/* Header */}
      <div className='rounded-lg border bg-card p-4 shadow-sm'>
        <h1 className='text-xl font-semibold tracking-tight text-foreground'>
          Hi{firstName ? `, ${firstName}` : ''} 👋
        </h1>
        <p className='text-sm text-muted-foreground'>Faculty administration overview</p>
      </div>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-12'>
        {/* Main */}
        <div className='flex flex-col gap-6 lg:col-span-8'>
          {/* Stats */}
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
            <AdminStat
              icon={Users}
              value={studentCount}
              label='Students'
              href='/dashboard/dean/users'
              loading={studentsLoading}
            />
            <AdminStat
              icon={GraduationCap}
              value={teacherCount}
              label='Teachers'
              href='/dashboard/dean/users'
              loading={teachersLoading}
            />
            <AdminStat
              icon={UserCheck}
              value={pendingCount}
              label='Pending approvals'
              href='/dashboard/dean/users'
              loading={pendingLoading}
              accent={pendingCount > 0}
            />
          </div>

          {/* Management hub */}
          <Card className='rounded-lg border-border'>
            <CardHeader className='border-b py-3'>
              <CardTitle className='text-base font-semibold'>Manage</CardTitle>
            </CardHeader>
            <CardContent className='pt-4'>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                {SHORTCUTS.map((s) => (
                  <Link
                    key={s.href}
                    href={s.href}
                    className='group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                  >
                    <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                      <s.icon className='size-5' />
                    </span>
                    <div className='min-w-0 flex-1'>
                      <p className='text-sm font-semibold text-foreground'>{s.title}</p>
                      <p className='truncate text-xs text-muted-foreground'>{s.desc}</p>
                    </div>
                    <ChevronRight className='size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground' />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className='flex flex-col gap-6 lg:col-span-4'>
          <MonthCalendar />

          <Card className='rounded-lg border-border'>
            <CardHeader className='flex flex-row items-center gap-2 border-b py-3'>
              <Bell className='size-4 text-muted-foreground' />
              <CardTitle className='text-base font-semibold'>Latest announcements</CardTitle>
            </CardHeader>
            <CardContent className='pt-3'>
              {announcements.length > 0 ? (
                <ul className='divide-y divide-border'>
                  {announcements
                    .slice(0, 4)
                    .map((a: { id: string | number; title: string }) => (
                      <li key={a.id}>
                        <Link
                          href='/dashboard/announcements'
                          className='flex items-start gap-2 py-2.5 transition-colors hover:bg-muted/40'
                        >
                          <Badge
                            variant='secondary'
                            className='mt-0.5 shrink-0 px-1.5 py-0 text-[10px] uppercase'
                          >
                            New
                          </Badge>
                          <span className='line-clamp-2 text-sm text-primary hover:underline'>
                            {a.title}
                          </span>
                        </Link>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className='py-4 text-center text-sm text-muted-foreground'>No announcements.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
