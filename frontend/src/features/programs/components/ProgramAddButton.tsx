'use client';

import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';

export function ProgramAddButton() {
  const role = useAuthStore((s) => s.user?.role);
  if (role !== 'SUPER_ADMIN') return null;

  return (
    <Link href='/dashboard/programs/new' className={cn(buttonVariants(), 'h-10')}>
      <Icons.add className='mr-2 h-4 w-4' />
      Add Program
    </Link>
  );
}
