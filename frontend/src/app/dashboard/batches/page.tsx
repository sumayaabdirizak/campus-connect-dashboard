import PageContainer from '@/components/layout/page-container';
import BatchesListingPage from '@/features/batches/components/batches-listing';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Icons } from '@/components/icons';

export default function Page() {
  return (
    <PageContainer
      pageTitle='Batches'
      pageDescription='Manage student intake batches.'
      pageHeaderAction={
        <Link href='/dashboard/batches/new' className={cn(buttonVariants(), 'h-10')}>
          <Icons.add className='mr-2 h-4 w-4' />
          Add Batch
        </Link>
      }
    >
      <BatchesListingPage />
    </PageContainer>
  );
}
