import type { LucideIcon } from 'lucide-react'
import { RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

/** DreamsPOS retail-dashboard "dash-count" tile: solid color block, icon top-left, refresh top-right. */
export function PlatformCountTile({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: LucideIcon
  value: string | number
  label: string
  tone: 'orange' | 'cyan' | 'navy' | 'green' | 'blue' | 'lightGreen'
}) {
  const tones: Record<typeof tone, string> = {
    orange: 'bg-[#F59E0B]',
    cyan: 'bg-[#0E7490]',
    navy: 'bg-[#172554]',
    green: 'bg-[#10B981]',
    blue: 'bg-primary',
    lightGreen: 'bg-[#4ADE80]',
  }

  return (
    <div className={cn('relative flex h-full flex-col justify-between rounded-xl p-4 text-white', tones[tone])}>
      <div className='flex items-start justify-between'>
        <Icon className='size-6 text-white/90' />
        <RotateCcw className='size-3.5 text-white/50' aria-hidden />
      </div>
      <div className='mt-3'>
        <p className='text-2xl font-bold tracking-tight'>{value}</p>
        <p className='text-sm text-white/70'>{label}</p>
      </div>
    </div>
  )
}
