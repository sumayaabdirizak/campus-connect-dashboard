import type { LucideIcon } from 'lucide-react'
import { Skeleton } from '@/features/ui/components/skeleton'
import { cn } from '@/lib/utils'

/** DreamsPOS retail-dashboard "dash-widget" card: light icon square + value + label. */
export function RetailStatCard({
  icon: Icon,
  value,
  label,
  tone,
  loading,
}: {
  icon: LucideIcon
  value: string | number
  label: string
  tone: 'sky' | 'emerald' | 'violet' | 'amber'
  loading?: boolean
}) {
  const tones: Record<typeof tone, string> = {
    sky: 'bg-[#EFF6FF] text-[#3B82F6]',
    emerald: 'bg-[#ECFDF5] text-[#10B981]',
    violet: 'bg-[#F5F3FF] text-[#8B5CF6]',
    amber: 'bg-[#FFFBEB] text-[#F59E0B]',
  }

  return (
    <div className='flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm'>
      <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl', tones[tone])}>
        <Icon className='size-5' />
      </span>
      <div className='min-w-0'>
        {loading ? (
          <Skeleton className='h-6 w-20' />
        ) : (
          <p className='text-lg font-bold tracking-tight text-[#101828]'>{value}</p>
        )}
        <p className='truncate text-sm text-[#667085]'>{label}</p>
      </div>
    </div>
  )
}
