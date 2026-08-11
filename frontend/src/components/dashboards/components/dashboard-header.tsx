'use client'

import type { User } from '@/lib/auth-store'

interface DashboardHeaderProps {
  user: User | null
  title: string
  subtitle: string
}

export function DashboardHeader({ user, title, subtitle }: DashboardHeaderProps) {
  return (
    <div className='flex items-center space-x-4'>
      {user?.avatarUrl && (
        <img
          src={user.avatarUrl}
          alt={user.name || 'User'}
          className='h-16 w-16 rounded-full object-cover'
        />
      )}
      <div>
        <h1 className='text-3xl font-bold'>{title}</h1>
        <p className='text-muted-foreground'>{subtitle}</p>
      </div>
    </div>
  )
}
