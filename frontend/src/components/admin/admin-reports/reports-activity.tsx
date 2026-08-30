'use client'

import { BarChart3 } from 'lucide-react'
import type { PlatformAnalytics } from '@/lib/admin/services'
import { Avatar, AvatarFallback } from '@/features/ui/components/avatar'
import { Badge } from '@/features/ui/components/badge'

export function ReportsActivity({ data }: { data?: PlatformAnalytics }) {
  return (
    <div className='rounded-xl border bg-card p-4'>
      <div className='mb-4 flex items-center gap-2'>
        <BarChart3 className='text-muted-foreground size-4' />
        <p className='text-sm font-semibold'>Recent activity</p>
      </div>
      {!data?.recentActivity?.length ? (
        <p className='text-muted-foreground py-8 text-center text-sm'>
          Activity will appear here as users interact with the platform.
        </p>
      ) : (
        <ul className='space-y-3'>
          {data.recentActivity.map((item) => (
            <li key={item.id} className='flex items-start gap-3 rounded-lg border px-3 py-2.5'>
              <Avatar className='size-8'>
                <AvatarFallback className='text-[10px]'>
                  {item.user.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className='min-w-0 flex-1'>
                <p className='text-sm'>
                  <span className='font-medium'>{item.user}</span>{' '}
                  <span className='text-muted-foreground'>{item.action}</span>
                </p>
                <p className='text-muted-foreground text-xs'>
                  {new Date(item.timestamp).toLocaleString()}
                </p>
              </div>
              <Badge variant='outline' className='capitalize shrink-0'>
                {item.type}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
