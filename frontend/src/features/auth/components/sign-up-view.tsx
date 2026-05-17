'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function SignUpViewPage() {
  return (
    <div className='flex min-h-screen bg-[#f8fafc] font-sans text-slate-900'>
      {/* LEFT SIDE: Visual/Branding */}
      <div className='relative hidden w-1/2 flex-col justify-between overflow-hidden lg:flex'>
        {/* Background Image with Blur */}
        <div
          className='absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105'
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop")'
          }}
        />

        {/* Soft Light Overlay */}
        <div className='absolute inset-0 bg-white/40 backdrop-blur-[2px]' />

        {/* Content */}
        <div className='relative z-10 p-12'>
          <div className='flex items-center gap-2'>
            <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563eb] text-white shadow-lg shadow-blue-500/20'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.5'
                strokeLinecap='round'
                strokeLinejoin='round'
                className='h-6 w-6'
              >
                <path d='M22 10v6M2 10l10-5 10 5-10 5z' />
                <path d='M6 12v5c3.33 3 8.67 3 12 0v-5' />
              </svg>
            </div>
            <span className='text-2xl font-bold tracking-tight text-slate-800'>Campus Contact</span>
          </div>
        </div>

        <div className='relative z-10 p-12'>
          <h2 className='mb-4 text-5xl font-extrabold leading-tight tracking-tight text-slate-900'>
            Join the
            <br />
            Modern
            <br />
            Academic Hub.
          </h2>
          <p className='max-w-md text-lg font-medium text-slate-700'>
            Empowering students and faculty through seamless digital coordination.
          </p>
        </div>

        {/* Footer Credit */}
        <div className='relative z-10 p-12 text-sm font-medium text-slate-600'>
          © 2026 Campus Contact Inc. All rights reserved.
        </div>
      </div>

      {/* RIGHT SIDE: Content */}
      <div className='flex w-full flex-col justify-center px-6 lg:w-1/2 lg:px-24'>
        <div className='mx-auto flex w-full max-w-md flex-col'>
          {/* Mobile Logo */}
          <div className='mb-10 flex items-center gap-2 lg:hidden'>
            <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563eb] text-white shadow-md'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.5'
                strokeLinecap='round'
                strokeLinejoin='round'
                className='h-5 w-5'
              >
                <path d='M22 10v6M2 10l10-5 10 5-10 5z' />
                <path d='M6 12v5c3.33 3 8.67 3 12 0v-5' />
              </svg>
            </div>
            <span className='text-xl font-bold tracking-tight'>Campus Contact</span>
          </div>

          {/* Header */}
          <div className='mb-8'>
            <h1 className='text-3xl font-bold tracking-tight text-slate-900'>Create account</h1>
            <p className='mt-2 text-slate-500'>
              Registration is currently restricted to campus administrators.
            </p>
          </div>

          {/* Info Box */}
          <div className='rounded-2xl border border-[#e5e7eb] bg-white p-8 shadow-sm text-center'>
            <div className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-[#2563eb]'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='32'
                height='32'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
                className='lucide lucide-shield-check'
              >
                <path d='M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z' />
                <path d='m9 12 2 2 4-4' />
              </svg>
            </div>

            <p className='mb-8 text-slate-600 leading-relaxed'>
              To maintain the integrity of our academic records, new user registration must be
              authorized by your faculty administration.
            </p>

            <Button
              asChild
              className='h-11 w-full bg-[#2563eb] font-semibold text-white shadow-md shadow-blue-500/10 transition-all hover:bg-[#1d4ed8] hover:shadow-lg'
            >
              <Link href='/auth/sign-in'>Back to Sign In</Link>
            </Button>
          </div>

          <p className='mt-8 text-center text-sm text-slate-500'>
            Need immediate help?{' '}
            <Link href='#' className='font-semibold text-[#2563eb] hover:underline'>
              Contact IT Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
