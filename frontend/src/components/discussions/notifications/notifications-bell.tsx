'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/features/ui/components/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/features/ui/components/popover'
import { ScrollArea } from '@/features/ui/components/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/components/tabs'
import { Icons } from '@/components/icons'
import { cn } from '@/lib/utils'
import {
  useMarkNotificationsRead,
  useUnreadCount,
} from '@/lib/discussions/queries/queries'
import type { DiscussionNotification } from '@/lib/discussions/queries/types'
import { buildHref } from './notification-helpers'
import { MentionsList, NotificationList } from './notification-lists'

export function NotificationsBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'all' | 'unread' | 'mentions'>('all')
  const { data: unreadData } = useUnreadCount()
  const markRead = useMarkNotificationsRead()

  const unread = Number(unreadData?.unreadCount ?? 0)

  const handleItemClick = (n: DiscussionNotification) => {
    setOpen(false)
    if (!n.readAt) markRead.mutate({ notificationIds: [n.id] })
    const href = buildHref(n)
    if (href) router.push(href)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='relative size-10 rounded-full text-foreground hover:bg-muted'
          aria-label='Notifications'
        >
          <Icons.notification className='h-4 w-4' />
          {unread > 0 && (
            <span
              aria-label={`${unread} unread`}
              className='absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground'
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align='end' className='w-[360px] p-0'>
        <div className='flex items-center justify-between border-b px-3 py-2'>
          <span className='text-sm font-semibold'>Notifications</span>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-7 px-2 text-[11px]'
            disabled={unread === 0 || markRead.isPending}
            onClick={() => markRead.mutate({ markAll: true })}
          >
            Mark all read
          </Button>
        </div>
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as 'all' | 'unread' | 'mentions')}
          className='flex flex-col'
        >
          <TabsList className='h-9 w-full justify-start rounded-none border-b bg-transparent p-0'>
            {(['all', 'unread', 'mentions'] as const).map((value) => (
              <TabsTrigger
                key={value}
                value={value}
                className={cn(
                  'h-9 flex-1 rounded-none border-b-2 border-transparent bg-transparent shadow-none',
                  'data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none'
                )}
              >
                {value === 'all' ? 'All' : value === 'unread' ? 'Unread' : '@ You'}
                {value === 'unread' && unread > 0 && (
                  <span className='ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary'>
                    {unread}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          <ScrollArea className='h-[420px]'>
            <TabsContent value='all' className='m-0'>
              <NotificationList filter='all' onItemClick={handleItemClick} />
            </TabsContent>
            <TabsContent value='unread' className='m-0'>
              <NotificationList filter='unread' onItemClick={handleItemClick} />
            </TabsContent>
            <TabsContent value='mentions' className='m-0'>
              <MentionsList onItemClick={handleItemClick} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
