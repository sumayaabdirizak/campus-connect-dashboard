'use client';

import dynamic from 'next/dynamic';

/**
 * The report's one chart, in its own chunk.
 *
 * A report opens on its summary, cards and tables — the chart sits below
 * them, and recharts is heavier than everything above it combined. Splitting
 * it lets the numbers paint without waiting for a plotting library.
 */
export const ReportOverviewChart = dynamic(
  () => import('./report-overview-chart').then((m) => m.ReportOverviewChart),
  {
    ssr: false,
    loading: () => (
      <div className='h-[19rem] animate-pulse rounded-xl border bg-card' aria-hidden />
    )
  }
);
