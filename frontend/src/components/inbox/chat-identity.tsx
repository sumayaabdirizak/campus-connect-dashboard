import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { avatarGradient } from '@/lib/discussions/services/avatar-color'
import { initialsOf } from './inbox-helpers'

/** Shared avatar used by inbox rows and chat headers. */
export function ChatIdentityAvatar({
  title,
  avatarUrl,
  badge,
  size = 'md',
}: {
  title: string
  avatarUrl?: string | null
  badge?: ReactNode
  size?: 'md' | 'lg'
}) {
  const box = size === 'lg' ? 'size-[52px]' : 'size-12'
  return (
    <div className='relative shrink-0'>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=''
          className={cn(box, 'rounded-full object-cover')}
        />
      ) : (
        <span
          className={cn(
            box,
            'flex items-center justify-center rounded-full text-[13px] font-bold tracking-tight text-white'
          )}
          style={{ background: avatarGradient(title) }}
        >
          {initialsOf(title)}
        </span>
      )}
      {badge ? (
        <span className='absolute -bottom-0.5 -right-0.5 flex size-[18px] items-center justify-center rounded-full bg-card ring-1 ring-[#E5E7EB]'>
          {badge}
        </span>
      ) : null}
    </div>
  )
}

/** Shared title + subtitle stack matching inbox ↔ channel header. */
export function ChatIdentityText({
  title,
  subtitle,
  trailing,
  titleClassName,
}: {
  title: ReactNode
  subtitle?: ReactNode
  trailing?: ReactNode
  titleClassName?: string
}) {
  return (
    <div className='min-w-0 flex-1 overflow-hidden'>
      <div className='flex items-center justify-between gap-2'>
        <p
          className={cn(
            'truncate text-[14px] font-semibold leading-5 text-foreground',
            titleClassName
          )}
        >
          {title}
        </p>
        {trailing ? (
          <span className='shrink-0 text-[11px] leading-4 tabular-nums text-muted-foreground'>
            {trailing}
          </span>
        ) : null}
      </div>
      {subtitle ? (
        <p className='mt-0.5 truncate text-[12px] leading-4 text-muted-foreground'>
          {subtitle}
        </p>
      ) : null}
    </div>
  )
}
