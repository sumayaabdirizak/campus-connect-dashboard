'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { ReportSection } from '@/lib/reports/types';
import { CHART_COLORS, axisTick, EmptyChart, gridProps } from './report-chart-ui';

const HIDDEN_KPIS = new Set(['quizSubmitted', 'gradedPct', 'resourceViewers']);

export function ReportSectionChart({ section }: { section: ReportSection }) {
  const data = section.kpis
    .filter((k) => k.value !== null && !HIDDEN_KPIS.has(k.key))
    .map((k) => ({
      name: k.label,
      value: k.value ?? 0
    }))
    .filter((d) => d.value > 0);

  if (data.length === 0) {
    return <EmptyChart message='No counts for this period.' />;
  }

  return (
    <ResponsiveContainer width='100%' height={data.length > 3 ? 200 : 160}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...gridProps} vertical={false} />
        <XAxis dataKey='name' tick={axisTick} interval={0} angle={-12} textAnchor='end' height={48} />
        <YAxis tick={axisTick} width={28} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey='value' fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
