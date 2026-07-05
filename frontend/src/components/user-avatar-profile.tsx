import { User } from '@/lib/auth-store';

interface UserAvatarProfileProps {
  className?: string;
  showInfo?: boolean;
  user: User | null;
}

export function UserAvatarProfile({ showInfo = false, user }: UserAvatarProfileProps) {
  if (!user) return null;

  return (
    <div className='flex items-center gap-2'>
      {showInfo && (
        <div className='grid flex-1 text-left text-sm leading-tight'>
          <span className='truncate font-semibold'>{user.full_name}</span>
          <span className='truncate text-xs'>{user.email}</span>
        </div>
      )}
    </div>
  );
}
