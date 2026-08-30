'use client';

import { CARD, META, SUBTITLE, TITLE_MD } from './report-theme';

export const CHART_COLORS = ['#3B82F6', '#10B981', '#6366F1', '#F59E0B', '#EF4444'];

export const gridProps = {
  strokeDasharray: '3 3',
  className: 'stroke-[#E5E7EB] dark:stroke-border/50'
} as const;

export const axisTick = { fontSize: 11, fill: '#667085' } as const;

export function ChartCard({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`p-4 ${CARD}`}>
      <div className='mb-3'>
        <p className={TITLE_MD}>{title}</p>
        {subtitle ? <p className={`mt-0.5 ${SUBTITLE}`}>{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function EmptyChart({ message }: { message: string }) {
  return <p className={`py-12 text-center ${META}`}>{message}</p>;
}

export function shortLabel(value: unknown, max = 14) {
  const s = String(value ?? '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
