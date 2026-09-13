'use client';

import type { Report } from '@/lib/reports/types';
import { META } from './report-theme';

const HIDDEN_KPIS = new Set(['quizSubmitted', 'gradedPct', 'resourceViewers']);

/** One quiet line of headline numbers — no icon cards. */
export function ReportDetailKpiStrip({ report }: { report: Report }) {
  const items = report.sections
    .filter((s) => s.kpis.some((k) => k.value !== null && !HIDDEN_KPIS.has(k.key)))
    .map((s) => {
      const kpi = s.kpis.find((k) => k.value !== null && !HIDDEN_KPIS.has(k.key));
      return kpi ? { label: s.label, value: kpi.value!, unit: kpi.unit } : null;
    })
    .filter(Boolean) as { label: string; value: number; unit?: string }[];

  if (items.length === 0) return null;

  return (
    <div className='flex flex-wrap gap-x-5 gap-y-2 border-b border-[#E5E7EB] px-4 py-3 dark:border-border'>
      {items.map((item) => (
        <div key={item.label} className='text-sm'>
          <span className={META}>{item.label}</span>
          <span className='ml-1.5 font-semibold tabular-nums text-[#101828] dark:text-foreground'>
            {item.value.toLocaleString()}{item.unit ?? ''}
          </span>
        </div>
      ))}
    </div>
  );
}
