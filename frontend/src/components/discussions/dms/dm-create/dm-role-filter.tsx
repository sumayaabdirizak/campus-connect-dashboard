'use client'

import { cn } from '@/lib/utils'
import type { RoleFilterKey } from './candidate-hierarchy'

const STUDENT_OPTIONS: { key: RoleFilterKey; label: string }[] = [
  { key: 'STUDENT', label: 'Students' },
  { key: 'TEACHER', label: 'Lecturers' },
]

const DEAN_OPTIONS: { key: RoleFilterKey; label: string }[] = [
  { key: 'STUDENT', label: 'Students' },
  { key: 'TEACHER', label: 'Teachers' },
]

export function DmRoleFilter({
  selected,
  onChange,
  variant = 'student',
}: {
  selected: RoleFilterKey[]
  onChange: (next: RoleFilterKey[]) => void
  variant?: 'student' | 'dean'
}) {
  const options = variant === 'dean' ? DEAN_OPTIONS : STUDENT_OPTIONS

  const toggle = (key: RoleFilterKey) => {
    if (selected.includes(key)) {
      if (selected.length === 1) return
      onChange(selected.filter((k) => k !== key))
      return
    }
    onChange([...selected, key])
  }

  return (
    <div className='space-y-1.5'>
      <label className='text-[11px] font-medium text-muted-foreground'>
        Who to include
      </label>
      <div className='flex flex-wrap gap-1.5'>
        {options.map((opt) => {
          const on = selected.includes(opt.key)
          return (
            <button
              key={opt.key}
              type='button'
              onClick={() => toggle(opt.key)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                on
                  ? 'border-primary bg-primary/10 text-[#1D4ED8]'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
