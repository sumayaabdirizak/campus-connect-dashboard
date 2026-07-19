'use client';

import { GraduationCap, MessagesSquare, ClipboardCheck } from 'lucide-react';
import { InteractiveGridPattern } from './interactive-grid';
import { cn } from '@/lib/utils';

export function SignInBrandPanel() {
  return (
    <div className='relative hidden h-full flex-col overflow-hidden bg-[oklch(0.22_0.09_292)] p-10 lg:flex'>
      <div className='pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-[oklch(0.75_0.13_292)]/25 blur-3xl' />
      <div className='pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-[oklch(0.78_0.12_350)]/15 blur-3xl' />
      <InteractiveGridPattern
        className={cn(
          'mask-[radial-gradient(500px_circle_at_center,white,transparent)]',
          'inset-x-0 inset-y-[0%] h-full skew-y-12 opacity-40'
        )}
      />

      <div className='relative z-20 flex items-center gap-2 text-white'>
        <span className='flex size-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25'>
          <GraduationCap className='size-5' />
        </span>
        <span className='font-display text-lg font-semibold tracking-tight'>Campus Connect</span>
      </div>

      <div className='relative z-20 mt-auto mb-auto'>
        <p className='animate-fade-up mb-4 text-xs font-semibold tracking-[0.25em] text-[oklch(0.8_0.09_292)]'>
          JAZEERA UNIVERSITY
        </p>
        <h1
          className='animate-fade-up font-display text-5xl leading-[1.05] font-bold tracking-tight text-white xl:text-6xl'
          style={{ animationDelay: '80ms' }}
        >
          Your campus,
          <br />
          <span className='text-[oklch(0.83_0.11_292)]'>one app.</span>
        </h1>
        <p
          className='animate-fade-up mt-5 max-w-sm text-sm leading-relaxed text-white/70'
          style={{ animationDelay: '160ms' }}
        >
          Courses, assignments, grades, group chats, and every university office — in one place, on
          any device.
        </p>

        <div className='animate-fade-up mt-8 flex flex-wrap gap-2' style={{ animationDelay: '240ms' }}>
          <span className='inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/20'>
            <ClipboardCheck className='size-3.5 text-[oklch(0.85_0.09_160)]' />
            Assignments &amp; grades
          </span>
          <span className='inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/20'>
            <MessagesSquare className='size-3.5 text-[oklch(0.85_0.09_220)]' />
            Class group chats
          </span>
          <span className='inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/20'>
            <GraduationCap className='size-3.5 text-[oklch(0.85_0.1_350)]' />
            Office support
          </span>
        </div>
      </div>

      <p className='relative z-20 text-xs text-white/40'>
        © {new Date().getFullYear()} Jazeera University · Campus Connect
      </p>
    </div>
  );
}
