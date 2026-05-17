import PageContainer from '@/components/layout/page-container';
import BatchSectionsListingPage from '@/features/batch-sections/components/batch-sections-listing';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Icons } from '@/components/icons';

export default function Page() {
  return (
    <PageContainer
      pageTitle='Batch Sections'
      pageDescription='Manage sections within batches.'
      pageHeaderAction={
        <Link href='/dashboard/batch-sections/new' className={cn(buttonVariants(), 'h-10')}>
          <Icons.add className='mr-2 h-4 w-4' />
          Add Section
        </Link>
      }
    >
      <BatchSectionsListingPage />
    </PageContainer>
  );
}
