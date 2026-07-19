import { Skeleton } from '@/components/ui/skeleton'

export function ListSkeleton() {
  return (
    <div className='divide-y'>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className='flex items-center gap-4 px-4 py-3'>
          <Skeleton className='h-4 w-6' />
          <Skeleton className='h-6 w-6' />
          <Skeleton className='h-10 w-10 rounded-full' />
          <div className='flex flex-1 flex-col gap-1.5'>
            <Skeleton className='h-4 w-40' />
            <Skeleton className='h-3 w-64' />
          </div>
          <Skeleton className='h-8 w-16 rounded-md' />
        </div>
      ))}
    </div>
  )
}
