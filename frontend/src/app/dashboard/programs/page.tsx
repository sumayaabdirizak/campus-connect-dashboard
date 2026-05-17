import PageContainer from '@/components/layout/page-container';
import ProgramsListingPage from '@/features/programs/components/programs-listing';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Icons } from '@/components/icons';

export default function Page() {
  return (
    <PageContainer
      pageTitle='Programs'
      pageDescription='Manage academic programs.'
      pageHeaderAction={
        <Link href='/dashboard/programs/new' className={cn(buttonVariants(), 'h-10')}>
          <Icons.add className='mr-2 h-4 w-4' />
          Add Program
        </Link>
      }
    >
      <ProgramsListingPage />
    </PageContainer>
  );
}
