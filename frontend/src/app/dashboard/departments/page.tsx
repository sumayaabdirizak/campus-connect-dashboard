import { Suspense } from 'react';
import DepartmentListingPage from '@/components/departments/department-listing';

export const metadata = {
  title: 'Dashboard: Departments'
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
      <DepartmentListingPage />
    </Suspense>
  );
}
