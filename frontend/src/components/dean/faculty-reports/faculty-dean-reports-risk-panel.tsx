import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import type { DeanReports } from '@/lib/dean/types';
import { priorityBadge } from './faculty-reports-chart-ui';

export function FacultyDeanReportsRiskPanel({ data }: { data?: DeanReports }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className='xl:col-span-2 space-y-4 rounded-xl border border-border bg-card p-4'
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
                <div key={s.id} className='rounded-lg border border-border px-3 py-2 text-sm'>
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
                <div key={c.course} className='rounded-lg border border-border px-3 py-2 text-sm'>
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
                <div key={d.department} className='rounded-lg border border-border px-3 py-2 text-sm'>
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
  );
}
