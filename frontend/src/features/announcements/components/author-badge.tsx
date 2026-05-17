import React from 'react';
import { formatDistanceToNow } from 'date-fns';

interface AuthorBadgeProps {
  name: string;
  timestamp: string;
}

export function AuthorBadge({ name, timestamp }: AuthorBadgeProps) {
  return (
    <div className='flex items-center gap-2 text-sm'>
      <span className='font-semibold text-foreground'>{name}</span>
      <span className='text-muted-foreground'>·</span>
      <span className='text-muted-foreground'>
        {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
      </span>
    </div>
  );
}
