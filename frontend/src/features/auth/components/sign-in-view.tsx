'use client';

import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SignInBrandPanel } from './sign-in-brand-panel';
import { SignInForm } from './sign-in-form';

export default function SignInViewPage() {
  return (
    <div className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden md:grid lg:max-w-none lg:grid-cols-2 lg:px-0'>
      <Link
        href='/'
        className={cn(
          buttonVariants({ variant: 'ghost' }),
          'absolute top-4 right-4 hidden md:top-8 md:right-8'
        )}
      >
        Home
      </Link>

      <SignInBrandPanel />

      <div className='flex h-full items-center justify-center p-4 lg:p-8'>
        <SignInForm />
      </div>
    </div>
  );
}
