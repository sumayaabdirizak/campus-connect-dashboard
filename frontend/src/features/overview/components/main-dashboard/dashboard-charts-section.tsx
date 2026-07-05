'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import type { PlatformAnalytics } from '@/features/admin/api/admin-api';

const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];
const QUIZ_COLORS = ['#6366f1', '#94a3b8'];

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className='rounded-xl border bg-card p-4 shadow-sm'>
      <p className='mb-3 text-sm font-semibold'>{title}</p>
      {children}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return <p className='text-muted-foreground py-10 text-center text-sm'>{message}</p>;
}

function ChartSkeleton() {
  return <Skeleton className='h-[220px] w-full rounded-lg' />;
}

export function DashboardChartsSection({
  data,
  loading,
}: {
  data?: PlatformAnalytics;
  loading?: boolean;
}) {
  const userGrowth = data?.charts.userGrowthDetailed ?? data?.charts.userGrowth ?? [];
  const courseEnrollment =
    data?.charts.coursePerformance?.slice(0, 8).map((c) => ({
      name: c.course || c.name,
      enrollments: c.enrollments,
    })) ?? [];
  const assignmentData = data?.charts.assignmentAnalytics
    ? [
        { name: 'Submitted', value: data.charts.assignmentAnalytics.submitted },
        { name: 'Pending', value: data.charts.assignmentAnalytics.pending },
        { name: 'Late', value: data.charts.assignmentAnalytics.late },
      ]
    : [];
  const quizPerf = data?.charts.quizPerformance;
  const quizChartData = quizPerf
    ? [
        { name: 'Passed', value: quizPerf.passed },
        { name: 'Failed', value: quizPerf.failed },
      ]
    : [];
  const systemUsage = data?.charts.systemUsage ?? [];

  if (loading) {
    return (
      <div className='grid grid-cols-1 gap-2 lg:grid-cols-2'>
        {Array.from({ length: 5 }).map((_, i) => (
          <ChartCard key={i} title='Loading…'>
            <ChartSkeleton />
          </ChartCard>
        ))}
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 gap-2 lg:grid-cols-2'>
      <ChartCard title='User growth'>
        {userGrowth.length === 0 ? (
          <EmptyChart message='No user growth data yet' />
        ) : (
          <ResponsiveContainer width='100%' height={220}>
            <AreaChart data={userGrowth}>
              <CartesianGrid strokeDasharray='3 3' className='stroke-border/50' />
              <XAxis dataKey='month' tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={32} />
              <Tooltip />
              <Legend />
              {'registrations' in (userGrowth[0] ?? {}) ? (
                <>
                  <Area
                    type='monotone'
                    dataKey='registrations'
                    stroke='#6366f1'
                    fill='#6366f1'
                    fillOpacity={0.15}
                    name='Registrations'
                  />
                  <Area
                    type='monotone'
                    dataKey='active'
                    stroke='#22c55e'
                    fill='#22c55e'
                    fillOpacity={0.1}
                    name='Active'
                  />
                </>
              ) : (
                <Area
                  type='monotone'
                  dataKey='users'
                  stroke='#6366f1'
                  fill='#6366f1'
                  fillOpacity={0.15}
                  name='Users'
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title='Course enrollment'>
        {courseEnrollment.length === 0 ? (
          <EmptyChart message='No enrollment data yet' />
        ) : (
          <ResponsiveContainer width='100%' height={220}>
            <BarChart data={courseEnrollment} layout='vertical' margin={{ left: 4 }}>
              <CartesianGrid strokeDasharray='3 3' className='stroke-border/50' horizontal={false} />
              <XAxis type='number' tick={{ fontSize: 11 }} />
              <YAxis type='category' dataKey='name' width={72} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey='enrollments' fill='#3b82f6' name='Students' radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title='Assignment submissions'>
        {assignmentData.every((d) => d.value === 0) ? (
          <EmptyChart message='No assignment data yet' />
        ) : (
          <ResponsiveContainer width='100%' height={220}>
            <PieChart>
              <Pie
                data={assignmentData}
                dataKey='value'
                nameKey='name'
                cx='50%'
                cy='50%'
                innerRadius={52}
                outerRadius={78}
                paddingAngle={2}
              >
                {assignmentData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title='Quiz performance'>
        {quizChartData.every((d) => d.value === 0) ? (
          <EmptyChart message='No quiz attempts yet' />
        ) : (
          <ResponsiveContainer width='100%' height={220}>
            <PieChart>
              <Pie
                data={quizChartData}
                dataKey='value'
                nameKey='name'
                cx='50%'
                cy='50%'
                innerRadius={52}
                outerRadius={78}
              >
                {quizChartData.map((_, i) => (
                  <Cell key={i} fill={QUIZ_COLORS[i % QUIZ_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title='System activity'>
        {systemUsage.length === 0 ? (
          <EmptyChart message='No activity recorded yet' />
        ) : (
          <ResponsiveContainer width='100%' height={220}>
            <LineChart data={systemUsage}>
              <CartesianGrid strokeDasharray='3 3' className='stroke-border/50' />
              <XAxis dataKey='day' tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={32} />
              <Tooltip />
              <Legend />
              <Line
                type='monotone'
                dataKey='visits'
                stroke='#7c3aed'
                strokeWidth={2}
                dot={false}
                name='Activity'
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
