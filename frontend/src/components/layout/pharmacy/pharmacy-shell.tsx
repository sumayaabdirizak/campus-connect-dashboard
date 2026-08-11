'use client';

import { cn } from '@/lib/utils';
import { PharmacyHeader } from './pharmacy-header';
import { PharmacySidebar } from './pharmacy-sidebar';
import { usePharmacySidebar } from './use-pharmacy-sidebar';

export function PharmacyShell({ children }: { children: React.ReactNode }) {
  const {
    expanded,
    mobileOpen,
    toggleMini,
    toggleMobile,
    closeMobile,
    onSidebarMouseEnter,
    onSidebarMouseLeave
  } = usePharmacySidebar();

  return (
    <div data-theme='campus-connect' className='h-dvh overflow-hidden bg-content-area'>
      <PharmacySidebar
        expanded={expanded}
        mobileOpen={mobileOpen}
        onMouseEnter={onSidebarMouseEnter}
        onMouseLeave={onSidebarMouseLeave}
      />
      {mobileOpen ? (
        <button
          type='button'
          className='fixed inset-0 z-[98] bg-black/35 lg:hidden'
          onClick={closeMobile}
          aria-label='Close sidebar menu'
        />
      ) : null}
      <div
        className={cn(
          'flex h-dvh min-h-0 min-w-0 flex-col overflow-hidden transition-[margin-left] duration-200 ease-out',
          'ml-0',
          expanded ? 'lg:ml-60' : 'lg:ml-[70px]'
        )}
      >
        <PharmacyHeader onMobileMenu={toggleMobile} onToggleSidebar={toggleMini} />
        <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
          {children}
        </div>
      </div>
    </div>
  );
}
