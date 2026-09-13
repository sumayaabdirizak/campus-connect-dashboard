'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { Report } from '@/lib/reports/types';
import { CHART_COLORS, ChartCard, EmptyChart, axisTick, gridProps } from './report-chart-ui';

/**
 * The template uses charts sparingly — most report pages are cards plus a
 * table, and only profit-and-loss reaches for a graph. So this is one chart
 * for the whole report: what was produced against what was actually engaged
 * with, which is the question a report is opened to answer.
 *
 * There was a second chart here breaking resources down by type. It was cut:
 * a four-slice donut of file kinds answers a question nobody opens a report
 * to ask, and the split is still in the Resources table's Type column.
 */
const ENGAGEMENT_KEY: Record<string, string> = {
  quizzes: 'quizAttempts',
  assignments: 'submissionCount',
  resources: 'resourceViews',
  discussions: 'replyCount',
  announcements: 'announcementReads',
  clubs: 'clubMembers'
};

/**
 * A student creates none of this, so "Created against Engagement" described
 * the wrong relationship entirely — the blue bars were the course's inventory
 * and the green series was the student. Named for what each side actually is.
 */
const STUDENT_SERIES = { created: 'Available', engagement: 'Their activity' };
const DEFAULT_SERIES = { created: 'Created', engagement: 'Engagement' };

/**
 * Course feed is left off the student chart: after the author filter those
 * posts are the student's own, so there is no "available" side to compare
 * them against. The Course feed section still reports them in full.
 */
const STUDENT_DOMAINS = new Set(['quizzes', 'assignments', 'resources']);

export function ReportOverviewChart({
  report,
  embedded = false
}: {
  report: Report;
  embedded?: boolean;
}) {
  const isStudent = report.scope === 'student';
  const series = isStudent ? STUDENT_SERIES : DEFAULT_SERIES;

  const data = report.sections
    .filter((s) => s.kpis.length > 0)
    .filter((s) => !isStudent || STUDENT_DOMAINS.has(s.key))
    .map((s) => {
      const engagement = s.kpis.find((k) => k.key === ENGAGEMENT_KEY[s.key]);
      return {
        name: s.label,
        created: s.kpis[0].value ?? 0,
        engagement: engagement?.value ?? 0
      };
    })
    .filter((d) => d.created > 0 || d.engagement > 0);

  const chart =
    data.length === 0 ? (
      <EmptyChart message='No activity recorded in this period.' />
    ) : (
      <ResponsiveContainer width='100%' height={embedded ? 220 : 240}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid {...gridProps} vertical={false} />
          <XAxis dataKey='name' tick={axisTick} />
          <YAxis tick={axisTick} width={32} allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar
            dataKey='created'
            name={series.created}
            fill={CHART_COLORS[0]}
            radius={[4, 4, 0, 0]}
            maxBarSize={34}
          />
          <Bar
            dataKey='engagement'
            name={series.engagement}
            fill={CHART_COLORS[1]}
            radius={[4, 4, 0, 0]}
            maxBarSize={34}
          />
        </BarChart>
      </ResponsiveContainer>
    );

  if (embedded) {
    return (
      <div>
        <p className='mb-3 text-sm font-medium text-[#101828] dark:text-foreground'>
          Activity overview
        </p>
        {chart}
      </div>
    );
  }

  return (
    <ChartCard
      title='Activity overview'
      subtitle={
        isStudent
          ? 'What their courses offer against what this student has done'
          : 'What exists against what is being used'
      }
    >
      {chart}
    </ChartCard>
  );
}
