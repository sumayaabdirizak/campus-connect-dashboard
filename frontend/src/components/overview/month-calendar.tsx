'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCalendarDeadlines } from '@/lib/calendar/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/components/card'
import { Button } from '@/features/ui/components/button'
import { cn } from '@/lib/utils'
import { MonthCalendarGrid } from './month-calendar/month-calendar-grid'
import { MonthCalendarDayList } from './month-calendar/month-calendar-day-list'
import type { DeadlineRow } from './month-calendar/types'

type Props = {
  /** `featured` = dashboard hero calendar (wide grid + side day list). */
  variant?: 'compact' | 'featured'
  className?: string
}

/**
 * Month calendar block: grid with deadline dots, prev/next/today, selected-day list.
 */
export function MonthCalendar({ variant = 'compact', className }: Props) {
  const featured = variant === 'featured'
  const [viewMonth, setViewMonth] = useState(() => new Date())
  const [selected, setSelected] = useState(() => new Date())

  const gridStart = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 })
  const gridEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 })
  const days = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart, gridEnd]
  )

  const { data } = useCalendarDeadlines(
    gridStart.toISOString(),
    gridEnd.toISOString()
  )

  const byDay = useMemo(() => {
    const m = new Map<string, DeadlineRow[]>()
    for (const d of data?.results ?? []) {
      if (!d.deadlineAt) continue
      const k = format(new Date(d.deadlineAt), 'yyyy-MM-dd')
      ;(m.get(k) ?? m.set(k, []).get(k)!).push(d)
    }
    return m
  }, [data])

  const selectedItems = byDay.get(format(selected, 'yyyy-MM-dd')) ?? []

  return (
    <Card
      className={cn(
        'rounded-lg border-border',
        featured && 'h-full w-full',
        className
      )}
    >
      <CardHeader className='flex flex-row items-center justify-between gap-2 border-b py-2.5'>
        <div className='min-w-0'>
          <CardTitle className='text-base font-semibold'>
            {format(viewMonth, 'MMMM yyyy')}
          </CardTitle>
          <Link href='/dashboard/calendar' className='text-xs text-primary hover:underline'>
            Open full calendar
          </Link>
        </div>
        <div className='flex items-center gap-1'>
          <Button
            variant='ghost'
            size='icon'
            className='size-7'
            aria-label='Previous month'
            onClick={() => setViewMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className='size-4' />
          </Button>
          <Button
            variant='ghost'
            size='sm'
            className='h-7 px-2 text-xs'
            onClick={() => {
              setViewMonth(new Date())
              setSelected(new Date())
            }}
          >
            Today
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='size-7'
            aria-label='Next month'
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className='size-4' />
          </Button>
        </div>
      </CardHeader>
      <CardContent className='p-3'>
        <div
          className={cn(
            featured && 'sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] sm:items-start sm:gap-3'
          )}
        >
          <MonthCalendarGrid
            days={days}
            viewMonth={viewMonth}
            selected={selected}
            byDay={byDay}
            onSelectDay={setSelected}
            size={featured ? 'lg' : 'sm'}
          />
          <MonthCalendarDayList
            selected={selected}
            items={selectedItems}
            featured={featured}
          />
        </div>
      </CardContent>
    </Card>
  )
}
