import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProfileSectionHeading({
  icon: Icon,
  title,
  className,
}: {
  icon: LucideIcon;
  title: string;
  className?: string;
}) {
  return (
    <div className={cn('mb-3 border-b border-border pb-3', className)}>
      <h2 className='flex items-center gap-2 text-base font-semibold text-foreground'>
        <span className='flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-white'>
          <Icon className='size-3.5' aria-hidden />
        </span>
        {title}
      </h2>
    </div>
  );
}
