'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';

export function InviteAcceptLoading() {
  return (
    <div className='flex h-full items-center justify-center'>
      <div className='w-full max-w-sm space-y-4'>
        <Skeleton className='h-40 w-full rounded-xl' />
        <Skeleton className='h-6 w-48' />
        <Skeleton className='h-10 w-full' />
      </div>
    </div>
  );
}

export function InviteAcceptError({ error }: { error: Error | null }) {
  const errorMsg = error?.message ?? '';
  const isExpired = errorMsg.includes('expired');
  const isRevoked = errorMsg.includes('revoked');

  return (
    <div className='flex h-full items-center justify-center'>
      <div className='flex flex-col items-center gap-3 text-center'>
        <Icons.alertCircle className='h-12 w-12 text-muted-foreground/50' />
        <h2 className='text-lg font-semibold'>
          {isExpired ? 'Invite Expired' : isRevoked ? 'Invite Revoked' : 'Invite Not Found'}
        </h2>
        <p className='max-w-xs text-sm text-muted-foreground'>
          {isExpired
            ? 'This invite link has expired. Ask the club owner for a new one.'
            : isRevoked
              ? 'This invite has been revoked by the club moderators.'
              : 'This invite link is invalid or the club is no longer available.'}
        </p>
        <Link href='/dashboard/clubs'>
          <Button variant='outline' size='sm'>
            Browse Clubs
          </Button>
        </Link>
      </div>
    </div>
  );
}
