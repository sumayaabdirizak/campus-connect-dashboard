'use client';

import { Search } from 'lucide-react';
import { Input } from '@/features/ui/components/input';
import { cn } from '@/lib/utils';

export type CourseTabSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  'aria-label'?: string;
  className?: string;
};

/** High-contrast search field — aligned right in tab headers. */
export function CourseTabSearch({
  value,
  onChange,
  placeholder = 'Search…',
  'aria-label': ariaLabel = placeholder,
  className
}: CourseTabSearchProps) {
  return (
    <div className={cn('relative w-full min-w-[12rem] max-w-xs sm:max-w-sm', className)}>
      <Search
        className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#667085] dark:text-muted-foreground'
        aria-hidden
      />
      <Input
        type='search'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className='h-9 border-[#D0D5DD] bg-white pl-9 text-sm text-[#101828] shadow-sm placeholder:text-[#667085] focus-visible:border-[#3B82F6] dark:border-border dark:bg-background dark:text-foreground dark:placeholder:text-muted-foreground'
      />
    </div>
  );
}
