'use client'

import { CardContent } from '@/features/ui/components/card'
import { Card } from '@/features/ui/components/card'

interface SummaryCardProps {
  icon: React.ReactNode
  title: string
  value: string | number
  color: 'blue' | 'orange' | 'green' | 'purple'
}

export function SummaryCard({ icon, title, value, color }: SummaryCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200',
    orange: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-200',
    green: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200',
    purple: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-200'
  }

  return (
    <Card className={colorClasses[color]}>
      <CardContent className='flex items-center space-x-4 p-4'>
        <div className='opacity-80'>{icon}</div>
        <div className='flex-1'>
          <p className='text-sm font-medium opacity-70'>{title}</p>
          <p className='text-2xl font-bold'>{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
