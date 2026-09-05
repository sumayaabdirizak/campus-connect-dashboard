'use client';

import { BookOpen, Users } from 'lucide-react';
import type { Report } from '@/lib/reports/types';
import { KPI_LABEL, KPI_VALUE } from './report-theme';

/** Headline coverage counts — clinic-style summary tiles. */
export function ReportCoverageStrip({ report }: { report: Report }) {
  const tiles = [
    {
      key: 'courses',
      label: 'Courses',
      value: report.coverage.courses,
      Icon: BookOpen,
      accent: 'border-l-primary bg-primary/10 dark:bg-primary/20'
    },
    ...(report.coverage.students != null
      ? [
          {
            key: 'students',
            label: 'Students',
            value: report.coverage.students,
            Icon: Users,
            accent: 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
          }
        ]
      : [])
  ];

  return (
    <div className='grid grid-cols-1 gap-3 border-b border-border p-4 sm:grid-cols-2'>
      {tiles.map((t) => (
        <div
          key={t.key}
          className={`flex items-center gap-3 rounded-xl border border-border border-l-4 px-4 py-3 ${t.accent}`}
        >
          <t.Icon className='size-5 shrink-0 text-primary' aria-hidden />
          <div>
            <p className={KPI_LABEL}>{t.label}</p>
            <p className={KPI_VALUE}>{t.value.toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
