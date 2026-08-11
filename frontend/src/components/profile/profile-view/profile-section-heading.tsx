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
    <div className={cn('mb-3 border-b border-[#E5E7EB] pb-3', className)}>
      <h2 className='flex items-center gap-2 text-base font-semibold text-[#101828]'>
        <span className='flex size-7 shrink-0 items-center justify-center rounded-full bg-[#3B82F6] text-white'>
          <Icon className='size-3.5' aria-hidden />
        </span>
        {title}
      </h2>
    </div>
  );
}
