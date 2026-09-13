import { Avatar, AvatarFallback, AvatarImage } from '@/features/ui/components/avatar';
import { cn } from '@/lib/utils';
import { resolvePublicAssetUrl } from '@/lib/resolve-public-asset-url';
import type { User } from '@/lib/auth-store';

interface UserAvatarProfileProps {
  className?: string;
  showInfo?: boolean;
  user: User | null;
}

function initials(user: User): string {
  const name = user.full_name || user.name || user.email;
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || user.email.slice(0, 2).toUpperCase()
  );
}

export function UserAvatarProfile({ className, showInfo = false, user }: UserAvatarProfileProps) {
  if (!user) return null;

  const displayName = user.full_name || user.name || user.email;
  const avatarSrc = resolvePublicAssetUrl(user.avatarUrl);

  return (
    <div className='flex min-w-0 items-center gap-2'>
      <Avatar className={cn('size-8 border border-border', className)}>
        {avatarSrc ? (
          <AvatarImage src={avatarSrc} alt={displayName} />
        ) : null}
        <AvatarFallback className='bg-primary/10 text-xs font-semibold text-primary'>
          {initials(user)}
        </AvatarFallback>
      </Avatar>
      {showInfo && (
        <div className='grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden'>
          <span className='truncate font-semibold'>{displayName}</span>
          <span className='truncate text-xs text-muted-foreground'>{user.email}</span>
        </div>
      )}
    </div>
  );
}
