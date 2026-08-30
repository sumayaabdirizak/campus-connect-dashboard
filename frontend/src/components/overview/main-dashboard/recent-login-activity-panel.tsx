'use client'

import { formatDistanceToNow } from 'date-fns'
import { LogIn } from 'lucide-react'
import { useQuery } from '@/lib/async-query'
import { Badge } from '@/features/ui/components/badge'
import { fetchUserLoginLogs } from '@/lib/reports/queries'
import { userInitials } from './dashboard-table-shared'
import { Avatar, AvatarFallback } from '@/features/ui/components/avatar'

/** Real login history (UserLoginLog), platform-wide — replaces the static Recent Users list. */
export function RecentLoginActivityPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'admin', 'user-logins', 1, 6, ''],
    queryFn: () => fetchUserLoginLogs('admin', { page: 1, pageSize: 6 }),
  })

  const rows = data?.results ?? []

  return (
    <div className='overflow-hidden rounded-xl border border-border bg-card'>
      <div className='flex items-center justify-between gap-2 border-b border-border px-4 py-3.5'>
        <div className='flex items-center gap-2'>
          <span className='flex size-7 items-center justify-center rounded-lg bg-[#ECFDF5] text-[#10B981]'>
            <LogIn className='size-3.5' />
          </span>
          <h2 className='text-sm font-bold text-foreground'>Recent Login Activity</h2>
        </div>
      </div>
      <div className='px-2 py-2'>
        {isLoading ? (
          <p className='py-6 text-center text-sm text-muted-foreground'>Loading…</p>
        ) : rows.length === 0 ? (
          <p className='py-6 text-center text-sm text-muted-foreground'>No login activity recorded yet.</p>
        ) : (
          <ul className='divide-y divide-[#F2F4F7]'>
            {rows.map((r) => (
              <li key={r.id} className='flex items-center gap-3 px-2 py-2.5'>
                <Avatar className='size-8'>
                  <AvatarFallback className='text-[10px]'>{userInitials(r.fullName)}</AvatarFallback>
                </Avatar>
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm font-medium text-foreground'>{r.fullName}</p>
                  <p className='truncate text-xs text-muted-foreground'>{r.email}</p>
                </div>
                {r.role ? (
                  <Badge variant='outline' className='shrink-0 font-normal capitalize'>
                    {r.role.replace('_', ' ').toLowerCase()}
                  </Badge>
                ) : null}
                <span className='shrink-0 text-right text-xs text-muted-foreground' title={new Date(r.loginAt).toLocaleString()}>
                  {formatDistanceToNow(new Date(r.loginAt), { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
