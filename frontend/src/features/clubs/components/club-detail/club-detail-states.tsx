import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Icons } from '@/components/icons'

export function ClubDetailLoading() {
  return (
    <div className='flex h-full flex-col'>
      <Skeleton className='h-40 w-full' />
      <div className='mx-auto flex w-full max-w-5xl gap-6 px-4 py-4'>
        <div className='flex-1 space-y-3'>
          <Skeleton className='h-10 w-64' />
          <Skeleton className='h-32 w-full rounded-xl' />
          <Skeleton className='h-32 w-full rounded-xl' />
        </div>
        <div className='hidden w-80 space-y-3 lg:block'>
          <Skeleton className='h-48 w-full rounded-xl' />
          <Skeleton className='h-32 w-full rounded-xl' />
        </div>
      </div>
    </div>
  )
}

export function ClubDetailNotFound() {
  return (
    <div className='flex h-full flex-col items-center justify-center gap-3'>
      <Icons.alertCircle className='h-10 w-10 text-muted-foreground/50' />
      <h2 className='text-sm font-medium'>Club not found</h2>
      <Link href='/dashboard/clubs'>
        <Button size='sm' variant='outline'>
          Back to Clubs
        </Button>
      </Link>
    </div>
  )
}
