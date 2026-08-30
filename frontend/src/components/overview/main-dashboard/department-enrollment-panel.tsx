'use client'

import { TrendingUp } from 'lucide-react'
import type { PlatformAnalytics } from '@/lib/admin'

/** DreamsPOS "Sales by Countries" panel, mapped to enrollment by department (no geo data in this domain). */
export function DepartmentEnrollmentPanel({
  data,
  loading,
}: {
  data?: PlatformAnalytics
  loading?: boolean
}) {
  const rows = [...(data?.charts.departmentPerformance ?? [])]
    .sort((a, b) => b.students - a.students)
    .slice(0, 6)
  const max = Math.max(1, ...rows.map((r) => r.students))

  return (
    <div className='flex h-full flex-col rounded-xl border border-border bg-card'>
      <div className='flex items-center justify-between gap-2 border-b border-border px-4 py-3.5'>
        <h2 className='text-sm font-bold text-foreground'>Enrollment by Department</h2>
      </div>
      <div className='flex-1 space-y-3 px-4 py-4'>
        {loading ? (
          <p className='py-6 text-center text-sm text-muted-foreground'>Loading…</p>
        ) : rows.length === 0 ? (
          <p className='py-6 text-center text-sm text-muted-foreground'>No department data yet.</p>
        ) : (
          rows.map((r) => (
            <div key={r.name} className='space-y-1'>
              <div className='flex items-center justify-between text-xs'>
                <span className='truncate font-medium text-foreground'>{r.name}</span>
                <span className='shrink-0 text-muted-foreground'>{r.students.toLocaleString()} students</span>
              </div>
              <div className='h-2 overflow-hidden rounded-full bg-muted'>
                <div
                  className='h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6]'
                  style={{ width: `${Math.round((r.students / max) * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
      {rows.length > 0 ? (
        <div className='border-t border-border px-4 py-3'>
          <p className='flex items-center gap-1 text-xs text-[#10B981]'>
            <TrendingUp className='size-3.5' />
            {rows.length} departments with active enrollment
          </p>
        </div>
      ) : null}
    </div>
  )
}
