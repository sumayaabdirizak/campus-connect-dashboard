'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  FileQuestion,
  GraduationCap,
  ScrollText,
  Settings,
  UserPlus,
} from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuickActionItem {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
}

export const MAIN_DASHBOARD_QUICK_ACTIONS: QuickActionItem[] = [
  {
    icon: BookOpen,
    title: 'Create Course',
    description: 'Add a new course to the catalogue',
    href: '/dashboard/dean/courses',
  },
  {
    icon: UserPlus,
    title: 'Add Student',
    description: 'Register a new student account',
    href: '/dashboard/users',
  },
  {
    icon: GraduationCap,
    title: 'Add Instructor',
    description: 'Invite or create a teacher profile',
    href: '/dashboard/users',
  },
  {
    icon: ClipboardList,
    title: 'Create Assignment',
    description: 'Manage course offerings & assignments',
    href: '/dashboard/dean/Assigning',
  },
  {
    icon: FileQuestion,
    title: 'Create Quiz',
    description: 'Set up assessments in active courses',
    href: '/dashboard/dean/Assigning',
  },
  {
    icon: BarChart3,
    title: 'View Reports',
    description: 'Platform analytics & exports',
    href: '/dashboard/admin/report',
  },
  {
    icon: ScrollText,
    title: 'Audit Logs',
    description: 'Review system activity history',
    href: '/dashboard/audit-logs',
  },
  {
    icon: Settings,
    title: 'Manage Settings',
    description: 'Profile & account preferences',
    href: '/dashboard/profile',
  },
];

export function DashboardQuickActions({ className }: { className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4', className)}>
      {MAIN_DASHBOARD_QUICK_ACTIONS.map((action) => (
        <Link
          key={action.title}
          href={action.href}
          className='group flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm transition-all hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        >
          <span className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
            <action.icon className='size-4' aria-hidden />
          </span>
          <div className='min-w-0 flex-1'>
            <p className='text-sm font-semibold'>{action.title}</p>
            <p className='text-muted-foreground truncate text-xs'>{action.description}</p>
          </div>
          <ChevronRight className='text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground' />
        </Link>
      ))}
    </div>
  );
}
