'use client';

import { GraduationCap } from 'lucide-react';

export function GraduatedBanner({ graduatedAt }: { graduatedAt?: string | null }) {
  return (
    <div className='mb-4 flex items-center gap-3 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-4'>
      <span className='flex size-10 shrink-0 items-center justify-center rounded-full bg-[#10B981] text-white'>
        <GraduationCap className='size-5' />
      </span>
      <div>
        <p className='text-sm font-bold text-[#065F46]'>You&apos;ve graduated 🎓</p>
        <p className='text-xs text-[#047857]'>
          {graduatedAt
            ? `Completed on ${new Date(graduatedAt).toLocaleDateString()}. `
            : ''}
          Your account and messages stay active — see your course history below.
        </p>
      </div>
    </div>
  );
}
