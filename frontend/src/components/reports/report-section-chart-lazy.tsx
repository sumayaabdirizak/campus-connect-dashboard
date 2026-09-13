'use client';

import dynamic from 'next/dynamic';
import type { ReportSection } from '@/lib/reports/types';
import { EmptyChart } from './report-chart-ui';

const chartLoading = () => (
  <div className='h-40 animate-pulse rounded-lg bg-[#F2F4F7] dark:bg-muted/40' aria-hidden />
);

export const ReportSectionChart = dynamic(
  () => import('./report-section-chart').then((m) => m.ReportSectionChart),
  { ssr: false, loading: chartLoading }
);

export function ReportSectionChartPanel({ section }: { section: ReportSection }) {
  if (section.kpis.length === 0 && section.rows.length === 0) {
    return <EmptyChart message='No activity in this period.' />;
  }

  return (
    <div className='rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-3 dark:border-border dark:bg-muted/20'>
      <p className='mb-2 text-xs font-medium text-[#667085] dark:text-muted-foreground'>
        Summary
      </p>
      <ReportSectionChart section={section} />
    </div>
  );
}
