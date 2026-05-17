import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from '@/lib/auth-store';

interface UserAvatarProfileProps {
  className?: string;
  showInfo?: boolean;
  user: User | null;
}

export function UserAvatarProfile({ className, showInfo = false, user }: UserAvatarProfileProps) {
  if (!user) return null;

  return (
    <div className='flex items-center gap-2'>
      <Avatar className={className}>
        <AvatarImage src={''} alt={user.full_name || ''} />
        <AvatarFallback className='rounded-lg'>
          {user.full_name?.slice(0, 2)?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>

      {showInfo && (
        <div className='grid flex-1 text-left text-sm leading-tight'>
          <span className='truncate font-semibold'>{user.full_name}</span>
          <span className='truncate text-xs'>{user.email}</span>
        </div>
      )}
    </div>
  );
}
