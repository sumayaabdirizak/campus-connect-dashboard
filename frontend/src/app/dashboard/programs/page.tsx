import { Suspense } from 'react';
import ProgramsListingPage from '@/components/programs/programs-listing';

export const metadata = {
  title: 'Dashboard: Programs'
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className='flex h-48 items-center justify-center'>
          <div className='size-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
        </div>
      }
    >
      <ProgramsListingPage />
    </Suspense>
  );
}
