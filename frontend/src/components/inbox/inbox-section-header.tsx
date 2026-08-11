'use client';

export function InboxSectionHeader({ label }: { label: string }) {
  return (
    <div className='sticky top-0 z-[1] border-b border-[#F2F4F7] bg-[#F8FAFC] px-4 py-1.5'>
      <p className='text-[11px] font-semibold uppercase tracking-wide text-[#667085]'>
        {label}
      </p>
    </div>
  );
}
