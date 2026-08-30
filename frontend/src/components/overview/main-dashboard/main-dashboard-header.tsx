'use client'

import Link from 'next/link'
import { Download, Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/features/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/features/ui/components/dropdown-menu'

/** Action buttons row — DreamsPOS greeting card renders the title. */
export function MainDashboardHeader({
  isFetching,
  onRefresh,
  onExport,
}: {
  isFetching: boolean
  onRefresh: () => void
  onExport: () => void
}) {
  return (
    <div className='relative flex flex-wrap items-center gap-2 sm:justify-end'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='h-9 border-border'
          onClick={onRefresh}
          disabled={isFetching}
        >
          <RefreshCw className={`mr-1.5 size-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='h-9 border-border'
          onClick={onExport}
        >
          <Download className='mr-1.5 size-3.5' />
          Export
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type='button' size='sm' className='h-9 bg-primary hover:bg-[#2563EB]'>
              <Plus className='mr-1.5 size-3.5' />
              Add New
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-52'>
            <DropdownMenuLabel>Create</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href='/dashboard/users'>User account</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href='/dashboard/faculties'>Faculty</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href='/dashboard/courses'>Course</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href='/dashboard/announcements'>Announcement</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
    </div>
  )
}
