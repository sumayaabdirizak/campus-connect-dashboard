'use client';

export function InboxSectionHeader({ label }: { label: string }) {
  return (
    <div className='sticky top-0 z-[1] border-b border-border bg-muted px-4 py-1.5'>
      <p className='text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
        {label}
      </p>
    </div>
  );
}
