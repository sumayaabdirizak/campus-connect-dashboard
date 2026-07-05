'use client';

import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  FileText,
  LineChart,
  RefreshCw,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DeanReports } from '@/features/dean/api/dean-api';
import {
  FacultyReportsFilters,
  type FacultyReportFilterState,
} from '@/features/dean/components/faculty-reports/faculty-reports-filters';
import {
  downloadFacultyReportsCsv,
  printFacultyReport,
} from '@/features/dean/components/faculty-reports/faculty-reports-export';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { showToast } from '@/lib/notifications';

const PIE_COLORS = ['#22c55e', '#3b82f6', '#6366f1', '#f59e0b', '#ef4444'];
const BAR_COLORS = ['#6366f1', '#22c55e', '#f59e0b'];

function ChartCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className='rounded-xl border bg-card p-4 shadow-sm'>
      <div className='mb-3 flex items-center justify-between gap-2'>
        <p className='text-sm font-semibold'>{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return <p className='text-muted-foreground py-12 text-center text-sm'>{message}</p>;
}

function priorityBadge(priority: string) {
  if (priority === 'high') return <Badge variant='destructive'>High</Badge>;
  if (priority === 'medium') return <Badge className='bg-amber-500/90 hover:bg-amber-500'>Medium</Badge>;
  return <Badge variant='secondary'>Low</Badge>;
}

interface FacultyDeanReportsDashboardProps {
  data?: DeanReports;
  isLoading: boolean;
  isRefreshing?: boolean;
  error?: string;
  filters: FacultyReportFilterState;
  onFiltersChange: (next: FacultyReportFilterState) => void;
  onRefresh: () => void;
}

export function FacultyDeanReportsDashboard({
  data,
  isLoading,
  isRefreshing,
  error,
  filters,
  onFiltersChange,
  onRefresh,
}: FacultyDeanReportsDashboardProps) {
  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    if (!data) return;
    if (format === 'csv' || format === 'excel') {
      downloadFacultyReportsCsv(data);
      showToast('success', `${format.toUpperCase()} export started`);
      return;
    }
    printFacultyReport(
      'Faculty Reports & Analytics',
      `<p>${data.scope.facultyName} — ${data.scope.periodLabel}</p>`
    );
  };

  return (
    <div className='space-y-4 pb-6'>
      {/* Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Faculty Reports & Analytics</h1>
          <p className='text-muted-foreground mt-1 text-sm'>
            Monitor academic performance, departmental activities, and faculty-wide insights.
          </p>
          {data ? (
            <p className='text-muted-foreground mt-1 text-xs'>
              {data.scope.facultyName} · {data.scope.periodLabel}
            </p>
          ) : null}
        </div>
        <div className='flex flex-wrap gap-2'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size='sm' variant='outline'>
                <Download className='mr-1.5 size-4' />
                Export Report
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuLabel>Export center</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <FileText className='mr-2 size-4' /> PDF — Current view
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                <FileSpreadsheet className='mr-2 size-4' /> Excel — Filtered data
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <Download className='mr-2 size-4' /> CSV — Complete faculty report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size='sm' variant='outline' onClick={onRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn('mr-1.5 size-4', isRefreshing && 'animate-spin')} />
            Refresh Data
          </Button>
        </div>
      </div>

      {error ? (
        <div className='rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
          {error}
        </div>
      ) : null}

      {/* Filters */}
      <FacultyReportsFilters
        filters={filters}
        onChange={onFiltersChange}
        departments={data?.filterOptions.departments ?? []}
        sticky
      />

      {/* Analytics charts */}
      <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
        <ChartCard title='Department performance comparison'>
          {data?.charts.departmentPerformance.length ? (
            <ResponsiveContainer width='100%' height={240}>
              <BarChart data={data.charts.departmentPerformance}>
                <CartesianGrid strokeDasharray='3 3' className='stroke-border' />
                <XAxis dataKey='department' tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey='gpa' fill={BAR_COLORS[0]} radius={[4, 4, 0, 0]} name='GPA' />
                <Bar dataKey='passRate' fill={BAR_COLORS[1]} radius={[4, 4, 0, 0]} name='Pass rate' />
                <Bar dataKey='completionRate' fill={BAR_COLORS[2]} radius={[4, 4, 0, 0]} name='Completion' />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message='No department performance data' />
          )}
        </ChartCard>

        <ChartCard title='Student performance distribution'>
          {data?.charts.performanceDistribution.some((d) => d.count > 0) ? (
            <ResponsiveContainer width='100%' height={240}>
              <PieChart>
                <Pie
                  data={data.charts.performanceDistribution}
                  dataKey='count'
                  nameKey='band'
                  cx='50%'
                  cy='50%'
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {data.charts.performanceDistribution.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message='No graded submissions yet' />
          )}
        </ChartCard>
      </div>

      {/* Course performance + Instructor performance */}
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        <ChartCard title='Highest-performing courses'>
          {data?.charts.topCourses.length ? (
            <div className='space-y-2'>
              {data.charts.topCourses.map((c) => (
                <div
                  key={c.course}
                  className='flex items-center justify-between rounded-lg border px-3 py-2 text-sm'
                >
                  <div>
                    <p className='font-medium'>{c.course}</p>
                    <p className='text-muted-foreground text-xs'>{c.name}</p>
                  </div>
                  <div className='text-right text-xs'>
                    <p className='font-semibold tabular-nums'>{c.avgScore}% avg</p>
                    <p className='text-muted-foreground'>{c.completion}% completion</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyChart message='No course data' />
          )}
        </ChartCard>

        <ChartCard title='Instructor performance'>
          {data?.charts.instructorPerformance.length ? (
            <ResponsiveContainer width='100%' height={220}>
              <BarChart data={data.charts.instructorPerformance} layout='vertical'>
                <CartesianGrid strokeDasharray='3 3' className='stroke-border' />
                <XAxis type='number' domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis type='category' dataKey='name' width={60} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey='completion' fill='#6366f1' name='Completion' radius={[0, 4, 4, 0]} />
                <Bar dataKey='engagement' fill='#22c55e' name='Engagement' radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message='No instructor data' />
          )}
        </ChartCard>
      </div>

      {/* Risk panel + Timeline */}
      <div className='grid grid-cols-1 gap-4 xl:grid-cols-3'>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className='xl:col-span-2 space-y-4 rounded-xl border bg-card p-4 shadow-sm'
        >
          <div className='flex items-center gap-2'>
            <AlertTriangle className='size-5 text-amber-500' />
            <h2 className='font-semibold'>Academic risk panel</h2>
          </div>
          <div className='grid gap-4 md:grid-cols-3'>
            <div>
              <p className='mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                Students at risk
              </p>
              <div className='space-y-2'>
                {data?.risks.students.length ? (
                  data.risks.students.map((s) => (
                    <div key={s.id} className='rounded-lg border px-3 py-2 text-sm'>
                      <div className='flex items-center justify-between gap-2'>
                        <span className='font-medium'>{s.name}</span>
                        {priorityBadge(s.priority)}
                      </div>
                      <p className='text-muted-foreground text-xs'>{s.reason}</p>
                    </div>
                  ))
                ) : (
                  <p className='text-muted-foreground text-xs'>No students flagged</p>
                )}
              </div>
            </div>
            <div>
              <p className='mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                Courses at risk
              </p>
              <div className='space-y-2'>
                {data?.risks.courses.length ? (
                  data.risks.courses.map((c) => (
                    <div key={c.course} className='rounded-lg border px-3 py-2 text-sm'>
                      <div className='flex items-center justify-between gap-2'>
                        <span className='font-medium'>{c.course}</span>
                        {priorityBadge(c.priority)}
                      </div>
                      <p className='text-muted-foreground text-xs'>
                        {c.failureRate}% failure indicators
                      </p>
                    </div>
                  ))
                ) : (
                  <p className='text-muted-foreground text-xs'>No courses flagged</p>
                )}
              </div>
            </div>
            <div>
              <p className='mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                Departments requiring attention
              </p>
              <div className='space-y-2'>
                {data?.risks.departments.length ? (
                  data.risks.departments.map((d) => (
                    <div key={d.department} className='rounded-lg border px-3 py-2 text-sm'>
                      <div className='flex items-center justify-between gap-2'>
                        <span className='font-medium'>{d.department}</span>
                        {priorityBadge(d.priority)}
                      </div>
                      <p className='text-muted-foreground text-xs'>
                        GPA {d.gpa.toFixed(1)} · {d.trend}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className='text-muted-foreground text-xs'>All departments on track</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <div className='rounded-xl border bg-card p-4 shadow-sm'>
          <div className='mb-3 flex items-center gap-2'>
            <LineChart className='text-muted-foreground size-4' />
            <h2 className='text-sm font-semibold'>Recent activities</h2>
          </div>
          <div className='space-y-3'>
            {isLoading && !data ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className='h-14 w-full' />)
            ) : data?.recentActivity.length ? (
              data.recentActivity.map((item) => (
                <div key={item.id} className='flex gap-3'>
                  <Avatar className='size-8'>
                    <AvatarFallback className='text-xs'>
                      {item.type === 'alert' ? '!' : 'R'}
                    </AvatarFallback>
                  </Avatar>
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-sm font-medium'>{item.title}</p>
                    <p className='text-muted-foreground line-clamp-2 text-xs'>{item.description}</p>
                    <p className='text-muted-foreground mt-0.5 text-[10px]'>
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyChart message='No recent activity' />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
