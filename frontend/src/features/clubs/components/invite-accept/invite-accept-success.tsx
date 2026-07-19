'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import type { AcceptInviteResponse, ClubInvitePreview } from '@/features/clubs/api/types';

export function InviteAcceptSuccess({
  club,
  acceptResult
}: {
  club: ClubInvitePreview['club'];
  acceptResult: AcceptInviteResponse;
}) {
  const themeColor = club.themeColor || '#6366f1';
  const slug = acceptResult.club?.slug ?? club.slug;

  return (
    <div className='flex h-full items-center justify-center'>
      <div className='flex flex-col items-center gap-4 text-center'>
        <div
          className='flex h-16 w-16 items-center justify-center rounded-2xl text-2xl'
          style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
        >
          <Icons.check className='h-8 w-8' />
        </div>
        <div>
          <h2 className='text-lg font-semibold'>
            {acceptResult.alreadyMember ? 'Already a Member!' : 'Welcome to the Club!'}
          </h2>
          <p className='text-sm text-muted-foreground'>
            You&apos;re now a member of <strong>{club.name}</strong>
          </p>
        </div>
        <div className='flex gap-2'>
          <Link href={`/dashboard/clubs/${slug}`}>
            <Button variant='outline' size='sm'>
              View Club
            </Button>
          </Link>
          {acceptResult.club?.serverId && (
            <Link href={`/dashboard/chat/${acceptResult.club.serverId}`}>
              <Button size='sm' style={{ backgroundColor: themeColor }}>
                <Icons.chat className='mr-1.5 h-3.5 w-3.5' />
                Open Chat
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
