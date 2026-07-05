'use client';

import {
  BookOpen,
  Building2,
  UserCheck,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DeanReports } from '@/features/dean/api/dean-api';
import {
  DashboardKpiCard,
  type DashboardKpiTone,
} from '@/features/overview/components/main-dashboard/dashboard-kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function buildFacultyKpiCards(data: DeanReports) {
  return [
    {
      icon: Building2,
      label: 'Total Departments',
      value: data.kpis.totalDepartments,
      description: 'Academic units in faculty',
      trend: 0,
      tone: 'indigo' as const,
    },
    {
      icon: Users,
      label: 'Total Students',
      value: data.kpis.totalStudents.toLocaleString(),
      description: 'Enrolled students',
      trend: data.kpis.trends.totalStudents,
      tone: 'sky' as const,
    },
    {
      icon: UserCheck,
      label: 'Total Instructors',
      value: data.kpis.totalInstructors,
      description: 'Faculty instructors',
      trend: data.kpis.trends.totalInstructors,
      tone: 'emerald' as const,
    },
    {
      icon: BookOpen,
      label: 'Total Courses',
      value: data.kpis.totalCourses,
      description: 'Courses offered',
      trend: data.kpis.trends.totalCourses,
      tone: 'violet' as const,
    },
  ] satisfies {
    icon: LucideIcon;
    label: string;
    value: string | number;
    description: string;
    trend: number;
    tone: DashboardKpiTone;
  }[];
}

function FacultyKpiGridSkeleton() {
  return (
    <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4'>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className='rounded-xl border bg-card p-4 shadow-sm'>
          <Skeleton className='size-9 rounded-xl' />
          <Skeleton className='mt-3 h-8 w-16' />
          <Skeleton className='mt-2 h-4 w-24' />
          <Skeleton className='mt-1 h-3 w-full' />
        </div>
      ))}
    </div>
  );
}

interface FacultyReportsKpiGridProps {
  data?: DeanReports;
  loading?: boolean;
  className?: string;
}

export function FacultyReportsKpiGrid({ data, loading, className }: FacultyReportsKpiGridProps) {
  if (loading && !data) {
    return <FacultyKpiGridSkeleton />;
  }

  if (!data) return null;

  const kpiCards = buildFacultyKpiCards(data);

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {kpiCards.map((kpi) => (
        <DashboardKpiCard
          key={kpi.label}
          icon={kpi.icon}
          label={kpi.label}
          value={kpi.value}
          description={kpi.description}
          trend={kpi.trend}
          tone={kpi.tone}
          status={
            kpi.trend > 0 ? 'positive' : kpi.trend < 0 ? 'negative' : 'neutral'
          }
        />
      ))}
    </div>
  );
}
