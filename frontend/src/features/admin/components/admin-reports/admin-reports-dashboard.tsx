'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  BarChart3,
  BookOpen,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  LineChart,
  PieChart,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart as ReLineChart,
  Pie,
  PieChart as RePieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { LucideIcon } from 'lucide-react';
import type { PlatformAnalytics } from '@/features/admin/api/admin-api';
import {
  AdminReportFilters,
  formatReportScopeSummary,
  type AdminReportFilterState,
} from '@/features/admin/components/admin-report-filters';
import {
  buildReportCatalog,
  downloadReportsCsv,
  printReportsPdf,
} from '@/features/admin/components/admin-reports/export-reports';
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

const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className='rounded-xl border bg-card p-4 shadow-sm'>
      <p className='mb-3 text-sm font-semibold'>{title}</p>
      {children}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  trend,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint: string;
  trend?: number;
  loading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className='rounded-xl border bg-card p-4 shadow-sm'
    >
      <div className='flex items-start justify-between'>
        <span className='flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground'>
          <Icon className='size-4' />
        </span>
        {trend != null && trend !== 0 ? (
          <span
            className={cn(
              'flex items-center gap-0.5 text-xs font-medium',
              trend > 0 ? 'text-emerald-600' : 'text-red-600'
            )}
          >
            {trend > 0 ? <TrendingUp className='size-3' /> : <TrendingDown className='size-3' />}
            {Math.abs(trend)}%
          </span>
        ) : null}
      </div>
      {loading ? (
        <Skeleton className='mt-3 h-8 w-20' />
      ) : (
        <p className='mt-3 text-2xl font-semibold tabular-nums'>{value}</p>
      )}
      <p className='mt-1 text-sm font-medium'>{label}</p>
      <p className='text-muted-foreground mt-0.5 text-xs'>{hint}</p>
    </motion.div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return <p className='text-muted-foreground py-12 text-center text-sm'>{message}</p>;
}

interface AdminReportsDashboardProps {
  data?: PlatformAnalytics;
  isLoading: boolean;
  isRefreshing?: boolean;
  error?: string;
  filters: AdminReportFilterState;
  onFiltersChange: (next: AdminReportFilterState) => void;
  facultiesLoading?: boolean;
  faculties: { id: number; name: string; code: string }[];
  onRefresh: () => void;
}

export function AdminReportsDashboard({
  data,
  isLoading,
  isRefreshing,
  error,
  filters,
  onFiltersChange,
  facultiesLoading,
  faculties,
  onRefresh,
}: AdminReportsDashboardProps) {
  const catalog = useMemo(() => buildReportCatalog(data), [data]);

  const assignmentPie = data
    ? [
        { name: 'Submitted', value: data.charts.assignmentAnalytics.submitted, color: PIE_COLORS[0] },
        { name: 'Pending', value: data.charts.assignmentAnalytics.pending, color: PIE_COLORS[1] },
        { name: 'Late', value: data.charts.assignmentAnalytics.late, color: PIE_COLORS[2] },
      ].filter((d) => d.value > 0)
    : [];

  const exportPdfSummary = () => {
    if (!data) return;
    const rows = catalog
      .map(
        (r) =>
          `<tr><td>${r.name}</td><td>${r.category}</td><td>${r.status}</td><td>${data.scope.periodLabel}</td></tr>`
      )
      .join('');
    printReportsPdf(
      'Reports & Analytics',
      `<table><thead><tr><th>Report</th><th>Category</th><th>Status</th><th>Period</th></tr></thead><tbody>${rows}</tbody></table>`
    );
  };

  return (
    <div className='space-y-6 pb-8'>
      {isRefreshing ? (
        <div className='pointer-events-none fixed inset-x-0 top-[var(--header-height)] z-50 h-0.5 bg-muted'>
          <div className='h-full w-1/3 animate-pulse bg-primary' />
        </div>
      ) : null}

      {/* Header */}
      <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Reports & Analytics</h1>
          <p className='text-muted-foreground mt-1 max-w-2xl text-sm'>
            Monitor platform performance, user engagement, academic activities, and operational
            insights.
          </p>
          {data ? (
            <p className='text-muted-foreground mt-1 text-xs'>{formatReportScopeSummary(data.scope)}</p>
          ) : null}
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button type='button' variant='outline' size='sm' onClick={onRefresh}>
            <RefreshCw className={cn('mr-1.5 size-3.5', isRefreshing && 'animate-spin')} />
            Refresh data
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type='button' variant='outline' size='sm'>
                <Download className='mr-1.5 size-3.5' />
                Export reports
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuLabel>Export center</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => downloadReportsCsv(catalog)}>
                <FileText className='mr-2 size-4' /> CSV — catalog
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadReportsCsv(catalog)}>
                <FileSpreadsheet className='mr-2 size-4' /> Excel — catalog
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportPdfSummary}>
                <FileText className='mr-2 size-4' /> PDF — summary
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPIs */}
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7'>
        <KpiCard icon={Users} label='Total users' value={(data?.kpis.totalUsers ?? 0).toLocaleString()} hint='Registered accounts' trend={data?.kpis.trends.totalUsers} loading={isLoading} />
        <KpiCard icon={Activity} label='Active users' value={(data?.kpis.activeUsersThisMonth ?? 0).toLocaleString()} hint='Active this month' trend={data?.kpis.trends.activeUsers} loading={isLoading} />
        <KpiCard icon={BookOpen} label='Total courses' value={data?.kpis.totalCourses ?? 0} hint='Published offerings' trend={data?.kpis.trends.totalCourses} loading={isLoading} />
        <KpiCard icon={ClipboardList} label='Submissions' value={(data?.kpis.assignmentsSubmitted ?? 0).toLocaleString()} hint='Assignment submissions' trend={data?.kpis.trends.assignmentsSubmitted} loading={isLoading} />
        <KpiCard icon={GraduationCap} label='Quiz attempts' value={(data?.kpis.quizAttempts ?? 0).toLocaleString()} hint='Total attempts' trend={data?.kpis.trends.quizAttempts} loading={isLoading} />
        <KpiCard icon={PieChart} label='Completion rate' value={`${data?.kpis.completionRate ?? 0}%`} hint='Average quiz score' trend={data?.kpis.trends.completionRate} loading={isLoading} />
        <KpiCard icon={LineChart} label='System usage' value={(data?.kpis.dailyActiveSessions ?? 0).toLocaleString()} hint='Sessions (14d messages)' trend={data?.kpis.trends.dailyActiveSessions} loading={isLoading} />
      </div>

      {/* Filters */}
      <div className='rounded-xl border bg-card p-4 shadow-sm'>
        <div className='mb-2 flex items-center justify-between gap-2'>
          <p className='text-sm font-semibold'>Global filters</p>
          <AdminReportFilters
            faculties={faculties}
            value={filters}
            onChange={onFiltersChange}
            loadingFaculties={facultiesLoading}
            disabled={isLoading}
          />
        </div>
        <p className='text-muted-foreground text-xs'>
          Faculty and period drive all charts. Additional filters refine the report catalog view.
        </p>
      </div>

      {error ? (
        <div className='rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
          {error}
        </div>
      ) : null}

      {/* Analytics charts */}
      {isLoading && !data ? (
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className='h-64 rounded-xl' />
          ))}
        </div>
      ) : data ? (
        <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
          <ChartCard title='User growth'>
            <ResponsiveContainer width='100%' height={240}>
              <ReLineChart data={data.charts.userGrowthDetailed}>
                <CartesianGrid strokeDasharray='3 3' className='stroke-border/50' />
                <XAxis dataKey='month' tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={32} />
                <Tooltip />
                <Legend />
                <Line type='monotone' dataKey='registrations' stroke='#6366f1' strokeWidth={2} dot={false} name='Registrations' />
                <Line type='monotone' dataKey='active' stroke='#22c55e' strokeWidth={2} dot={false} name='Active' />
              </ReLineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title='Course performance'>
            {data.charts.coursePerformance.length === 0 ? (
              <EmptyChart message='No course enrollment data' />
            ) : (
              <ResponsiveContainer width='100%' height={240}>
                <BarChart data={data.charts.coursePerformance.slice(0, 6)}>
                  <CartesianGrid strokeDasharray='3 3' className='stroke-border/50' vertical={false} />
                  <XAxis dataKey='course' tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} width={32} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey='enrollments' fill='#6366f1' name='Enrollments' radius={[4, 4, 0, 0]} />
                  <Bar dataKey='completions' fill='#22c55e' name='Completions' radius={[4, 4, 0, 0]} />
                  <Bar dataKey='dropouts' fill='#ef4444' name='Dropouts' radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title='Assignment analytics'>
            {assignmentPie.length === 0 ? (
              <EmptyChart message='No assignment data' />
            ) : (
              <div className='flex items-center gap-6'>
                <ResponsiveContainer width={200} height={200}>
                  <RePieChart>
                    <Pie data={assignmentPie} dataKey='value' nameKey='name' innerRadius={52} outerRadius={80} paddingAngle={2}>
                      {assignmentPie.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
                <div className='space-y-2 text-sm'>
                  {assignmentPie.map((d) => (
                    <div key={d.name} className='flex items-center gap-2'>
                      <span className='size-2.5 rounded-full' style={{ background: d.color }} />
                      <span className='text-muted-foreground'>{d.name}</span>
                      <span className='font-medium tabular-nums'>{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ChartCard>

          <ChartCard title='Quiz performance'>
            <ResponsiveContainer width='100%' height={240}>
              <BarChart
                data={[
                  { name: 'Avg score', value: data.charts.quizPerformance.averageScore },
                  { name: 'Pass rate', value: data.charts.quizPerformance.passRate },
                  { name: 'Fail rate', value: data.charts.quizPerformance.failRate },
                ]}
              >
                <CartesianGrid strokeDasharray='3 3' className='stroke-border/50' vertical={false} />
                <XAxis dataKey='name' tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={32} />
                <Tooltip />
                <Bar dataKey='value' fill='hsl(var(--primary))' radius={[4, 4, 0, 0]} name='%' />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title='Department performance'>
            {data.charts.departmentPerformance.length === 0 ? (
              <EmptyChart message='No department data' />
            ) : (
              <ResponsiveContainer width='100%' height={240}>
                <BarChart data={data.charts.departmentPerformance.slice(0, 8)} layout='vertical' margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray='3 3' className='stroke-border/50' horizontal={false} />
                  <XAxis type='number' domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <YAxis type='category' dataKey='name' width={88} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey='completionRate' fill='#3b82f6' name='Completion %' radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title='System usage'>
            <ResponsiveContainer width='100%' height={240}>
              <AreaChart data={data.charts.systemUsage}>
                <CartesianGrid strokeDasharray='3 3' className='stroke-border/50' />
                <XAxis dataKey='day' tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} width={32} />
                <Tooltip />
                <Area type='monotone' dataKey='visits' stroke='#7c3aed' fill='#7c3aed' fillOpacity={0.12} name='Activity' />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      ) : null}

      {/* Recent activity */}
      <div className='rounded-xl border bg-card p-4 shadow-sm'>
        <div className='mb-4 flex items-center gap-2'>
          <BarChart3 className='text-muted-foreground size-4' />
          <p className='text-sm font-semibold'>Recent activity</p>
        </div>
        {!data?.recentActivity?.length ? (
          <p className='text-muted-foreground py-8 text-center text-sm'>
            Activity will appear here as users interact with the platform.
          </p>
        ) : (
          <ul className='space-y-3'>
            {data.recentActivity.map((item) => (
              <li key={item.id} className='flex items-start gap-3 rounded-lg border px-3 py-2.5'>
                <Avatar className='size-8'>
                  <AvatarFallback className='text-[10px]'>
                    {item.user.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className='min-w-0 flex-1'>
                  <p className='text-sm'>
                    <span className='font-medium'>{item.user}</span>{' '}
                    <span className='text-muted-foreground'>{item.action}</span>
                  </p>
                  <p className='text-muted-foreground text-xs'>
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                </div>
                <Badge variant='outline' className='capitalize shrink-0'>
                  {item.type}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
