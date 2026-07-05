'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Users,
  BookOpen,
  Layers,
  ClipboardList,
  UsersRound,
  Megaphone,
  Bell,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDeanReports } from '@/features/dean/api/queries';
import { FacultyReportsKpiGrid } from '@/features/dean/components/faculty-reports/faculty-reports-kpi-grid';
import { useAnnouncements } from '@/features/announcements/api/queries';
import { MonthCalendar } from './month-calendar';

const SHORTCUTS: { icon: LucideIcon; title: string; desc: string; href: string }[] = [
  { icon: Users, title: 'Users', desc: 'Students, teachers & staff', href: '/dashboard/dean/users' },
  { icon: BookOpen, title: 'Courses', desc: 'Faculty course catalogue', href: '/dashboard/dean/courses' },
  { icon: Layers, title: 'Batches', desc: 'Batches & sections overview', href: '/dashboard/dean/batches' },
  { icon: ClipboardList, title: 'Offerings', desc: 'Active course offerings', href: '/dashboard/dean/Assigning' },
  { icon: UsersRound, title: 'Clubs', desc: 'Approve & manage clubs', href: '/dashboard/dean/clubs' },
  {
    icon: Megaphone,
    title: 'Announcements',
    desc: 'Publish & schedule',
    href: '/dashboard/announcements'
  }
];

export function AdminDashboard({ user }: { user: { full_name?: string } }) {
  const { data: reportsData, isLoading: reportsLoading } = useDeanReports({ period: '6m' });
  const { data: announcementsData } = useAnnouncements();

  const announcements = announcementsData ?? [];
  const firstName = user?.full_name?.split(' ')[0];

  return (
    <div className='flex-1 space-y-6'>
      {/* Header */}
      <div className='relative overflow-hidden rounded-xl bg-gradient-to-br from-primary via-primary to-primary/80 p-5 text-primary-foreground shadow-sm'>
        <div
          className='pointer-events-none absolute -top-16 -right-12 size-48 rounded-full bg-primary-foreground/10 blur-3xl'
          aria-hidden
        />
        <div className='relative'>
          <h1 className='text-xl font-bold tracking-tight'>
            Hi{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className='text-sm text-primary-foreground/80'>Faculty administration overview</p>
        </div>
      </div>

      <FacultyReportsKpiGrid data={reportsData} loading={reportsLoading} />

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-12'>
        {/* Main */}
        <div className='flex flex-col gap-6 lg:col-span-8'>
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
