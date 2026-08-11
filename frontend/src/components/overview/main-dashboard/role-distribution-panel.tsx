'use client'

import { Users2 } from 'lucide-react'
import type { PlatformAnalytics } from '@/lib/admin'

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#F43F5E', '#06B6D4']

/** Platform users broken down by role. */
export function RoleDistributionPanel({
  data,
  loading,
}: {
  data?: PlatformAnalytics
  loading?: boolean
}) {
  const rows = [...(data?.charts.roleDistribution ?? [])]
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
  const total = rows.reduce((sum, r) => sum + r.count, 0) || 1

  return (
    <div className='flex h-full flex-col rounded-2xl border border-[#E5E7EB] bg-white shadow-sm'>
      <div className='flex items-center gap-2 border-b border-[#F2F4F7] px-4 py-3.5'>
        <span className='flex size-7 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#3B82F6]'>
          <Users2 className='size-3.5' />
        </span>
        <h2 className='text-sm font-bold text-[#101828]'>Role Distribution</h2>
      </div>
      <div className='flex-1 space-y-3 px-4 py-4'>
        {loading ? (
          <p className='py-6 text-center text-sm text-[#667085]'>Loading…</p>
        ) : rows.length === 0 ? (
          <p className='py-6 text-center text-sm text-[#667085]'>No role data yet.</p>
        ) : (
          rows.map((r, i) => {
            const pct = Math.round((r.count / total) * 100)
            return (
              <div key={r.role} className='space-y-1'>
                <div className='flex items-center justify-between text-xs'>
                  <span className='flex items-center gap-1.5 font-medium text-[#101828]'>
                    <span
                      className='size-2 shrink-0 rounded-full'
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    {r.role.replace('_', ' ')}
                  </span>
                  <span className='text-[#667085]'>
                    {r.count.toLocaleString()} · {pct}%
                  </span>
                </div>
                <div className='h-2 overflow-hidden rounded-full bg-[#F2F4F7]'>
                  <div
                    className='h-full rounded-full'
                    style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
