'use client';

import type { DeanReports } from '@/features/dean/api/dean-api';
import type { FacultyReportCatalogItem } from '@/features/dean/components/faculty-reports/faculty-reports-export';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Sparkles } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function FacultyReportDetailSheet({
  report,
  data,
  open,
  onOpenChange,
}: {
  report: FacultyReportCatalogItem | null;
  data?: DeanReports;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!report || !data) return null;

  const metrics = [
    { label: 'Departments', value: data.kpis.totalDepartments },
    { label: 'Students', value: data.kpis.totalStudents },
    { label: 'Instructors', value: data.kpis.totalInstructors },
    { label: 'Average GPA', value: data.kpis.averageGpa.toFixed(2) },
    { label: 'Attendance', value: `${data.kpis.attendanceRate}%` },
    { label: 'Completion', value: `${data.kpis.courseCompletionRate}%` },
  ];

  const chartData = data.charts.departmentPerformance.slice(0, 6);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full overflow-y-auto sm:max-w-xl'>
        <SheetHeader>
          <SheetTitle>{report.name}</SheetTitle>
          <SheetDescription>{report.description}</SheetDescription>
        </SheetHeader>

        <div className='mt-6 space-y-6'>
          <section className='space-y-2'>
            <h3 className='text-sm font-semibold'>Summary</h3>
            <div className='grid gap-2 text-sm'>
              <div className='flex justify-between gap-4'>
                <span className='text-muted-foreground'>Reporting period</span>
                <span>{data.scope.periodLabel}</span>
              </div>
              <div className='flex justify-between gap-4'>
                <span className='text-muted-foreground'>Faculty</span>
                <span>{data.scope.facultyName}</span>
              </div>
              <div className='flex justify-between gap-4'>
                <span className='text-muted-foreground'>Generated</span>
                <span>{new Date(data.scope.generatedAt).toLocaleString()}</span>
              </div>
              <div className='flex justify-between gap-4'>
                <span className='text-muted-foreground'>Category</span>
                <Badge variant='outline'>{report.category}</Badge>
              </div>
            </div>
          </section>

          <Separator />

          <section className='space-y-3'>
            <h3 className='text-sm font-semibold'>Key metrics</h3>
            <div className='grid grid-cols-2 gap-2'>
              {metrics.map((m) => (
                <div key={m.label} className='bg-muted/30 rounded-xl border p-3'>
                  <p className='text-muted-foreground text-xs'>{m.label}</p>
                  <p className='text-lg font-semibold tabular-nums'>{m.value}</p>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          <section className='space-y-3'>
            <h3 className='text-sm font-semibold'>Charts</h3>
            <div className='rounded-xl border p-3'>
              <p className='text-muted-foreground mb-2 text-xs'>Department GPA comparison</p>
              <ResponsiveContainer width='100%' height={180}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray='3 3' className='stroke-border' />
                  <XAxis dataKey='department' tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 4]} />
                  <Tooltip />
                  <Bar dataKey='gpa' fill='#6366f1' radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <Separator />

          <section className='space-y-3'>
            <h3 className='flex items-center gap-1.5 text-sm font-semibold'>
              <Sparkles className='text-amber-500 size-4' />
              Insights
            </h3>
            <ul className='space-y-2'>
              {data.insights.map((insight, i) => (
                <li
                  key={i}
                  className='bg-muted/30 rounded-lg border px-3 py-2 text-sm leading-relaxed'
                >
                  {insight}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
