'use client';

import { UserAvatarProfile } from '@/components/user-avatar-profile';
import { Button } from '@/features/ui/components/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import { UserProfileMenu } from '../user-profile-menu';
import { topbarLinkClass } from '@/features/layout/components/pharmacy/pharmacy-ui';

export function HeaderUserAvatar({ variant = 'default' }: { variant?: 'default' | 'pharmacy' }) {
  const user = useAuthStore((state) => state.user);
  if (!user) return null;

  if (variant === 'pharmacy') {
    return (
      <UserProfileMenu>
        <button type='button' className={cn(topbarLinkClass, 'overflow-hidden p-0')} aria-label='Open user menu'>
          <UserAvatarProfile className='size-full rounded-full object-cover' user={user} />
        </button>
      </UserProfileMenu>
    );
  }

  return (
    <UserProfileMenu>
      <Button
        variant='ghost'
        size='icon'
        className='size-9 shrink-0 rounded-full p-0 hover:bg-muted/70'
        aria-label='Open user menu'
      >
        <UserAvatarProfile className='size-9 rounded-full' user={user} />
      </Button>
    </UserProfileMenu>
  );
}
