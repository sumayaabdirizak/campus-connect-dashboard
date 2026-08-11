'use client'

import Image from 'next/image'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

/** DreamsPOS "Weekly Earning" hero card — big number, trend line, illustrated icon. */
export function HeroMetricCard({
  label,
  value,
  trend,
}: {
  label: string
  value: string
  trend?: number
}) {
  const up = trend != null && trend >= 0

  return (
    <div className='flex h-full items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm'>
      <div>
        <p className='text-sm text-[#667085]'>{label}</p>
        <p className='mt-1 text-3xl font-bold tracking-tight text-[#101828]'>{value}</p>
        {trend != null ? (
          <p
            className={cn(
              'mt-1.5 flex items-center gap-1 text-xs font-medium',
              up ? 'text-[#10B981]' : 'text-[#F43F5E]'
            )}
          >
            {up ? <TrendingUp className='size-3.5' /> : <TrendingDown className='size-3.5' />}
            {Math.abs(trend)}%<span className='font-normal text-[#667085]'>&nbsp;vs last period</span>
          </p>
        ) : null}
      </div>
      <Image
        src='/assets/dashboard-icons/total-users-illustration.svg'
        alt=''
        width={104}
        height={104}
        className='shrink-0'
      />
    </div>
  )
}
