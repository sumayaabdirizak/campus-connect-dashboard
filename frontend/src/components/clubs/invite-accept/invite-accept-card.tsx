'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import type { ClubInvitePreview } from '@/lib/clubs/types';
import { isPastIso } from '@/lib/format-time';

export interface InviteAcceptCardProps {
  data: ClubInvitePreview;
  isPending: boolean;
  onAccept: () => void;
}

export function InviteAcceptCard({ data, isPending, onAccept }: InviteAcceptCardProps) {
  const { club, inviter } = data;
  const themeColor = club.themeColor || '#6366f1';
  const inviteExpired = data.expiresAt != null && isPastIso(data.expiresAt);

  return (
    <div className='flex h-full items-center justify-center'>
      <div className='w-full max-w-sm overflow-hidden rounded-xl border shadow-lg'>
        <div
          className='relative h-32 w-full overflow-hidden'
          style={{
            background: club.bannerUrl
              ? `url(${club.bannerUrl}) center/cover`
              : `linear-gradient(135deg, ${themeColor}50, ${themeColor}20, transparent)`,
          }}
        >
          <div
            className='absolute inset-x-0 bottom-0 h-16'
            style={{
              background: 'linear-gradient(to top, hsl(var(--card)), transparent)',
            }}
          />
        </div>

        <div className='space-y-4 px-5 pb-5 -mt-6 relative'>
          <div
            className='flex h-14 w-14 items-center justify-center rounded-xl border-4 border-card text-lg font-bold'
            style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
          >
            {club.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={club.iconUrl} alt='' className='h-full w-full rounded-lg object-cover' />
            ) : (
              club.name
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase())
                .join('')
            )}
          </div>

          <div>
            <div className='flex items-center gap-2'>
              <h2 className='text-lg font-semibold'>{club.name}</h2>
              {club.isOfficial && <Icons.circleCheck className='h-4 w-4 text-blue-500' />}
            </div>
            {club.tagline && <p className='text-sm text-muted-foreground'>{club.tagline}</p>}
          </div>

          <div className='flex items-center gap-3 text-xs text-muted-foreground'>
            <span className='flex items-center gap-1'>
              <Icons.teams className='h-3.5 w-3.5' />
              {club.memberCountCache} member{club.memberCountCache !== 1 ? 's' : ''}
            </span>
          </div>

          {inviter && (
            <p className='text-xs text-muted-foreground'>
              Invited by <strong>{inviter.full_name}</strong>
            </p>
          )}

          <Button
            className='w-full'
            onClick={onAccept}
            disabled={isPending || inviteExpired}
            style={{ backgroundColor: themeColor }}
          >
            {isPending ? (
              <>
                <Icons.spinner className='mr-1.5 h-4 w-4 animate-spin' />
                Joining...
              </>
            ) : inviteExpired ? (
              'Invite expired'
            ) : (
              'Accept Invite & Join'
            )}
          </Button>

          {data.expiresAt && (
            <p className='text-center text-[10px] text-muted-foreground'>
              {inviteExpired ? 'This invite has expired.' : 'This invite expires on '}
              {!inviteExpired ? (
                <>
                  {new Date(data.expiresAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </>
              ) : null}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default InviteAcceptCard;
