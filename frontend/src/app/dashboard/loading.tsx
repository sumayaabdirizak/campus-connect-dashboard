import { Skeleton } from '@/components/ui/skeleton';

/**
 * Route-level loading fallback for dashboard segments that don't define their
 * own. Mirrors the PageContainer header + content rhythm so the transition into
 * a page feels continuous rather than a blank flash.
 */
export default function DashboardLoading() {
  return (
    <div className='flex flex-1 flex-col gap-4 p-4 md:px-6'>
      <div className='space-y-2'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-4 w-80 max-w-full' />
      </div>
      <Skeleton className='mt-4 h-40 w-full rounded-lg' />
      <Skeleton className='h-40 w-full rounded-lg' />
    </div>
  );
}
