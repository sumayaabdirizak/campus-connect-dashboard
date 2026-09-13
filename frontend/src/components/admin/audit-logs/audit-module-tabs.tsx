'use client';

import type { AuditModule } from '@/lib/admin/services';
import { cn } from '@/lib/utils';

export const AUDIT_MODULE_TABS: { id: AuditModule; label: string }[] = [
  { id: 'all', label: 'All activity' },
  { id: 'Announcements', label: 'Announcements' },
  { id: 'Discussions', label: 'Discussions' },
  { id: 'Clubs', label: 'Clubs' },
  { id: 'Notifications', label: 'Notifications' },
];

export function AuditModuleTabNav({
  active,
  onChange,
}: {
  active: AuditModule;
  onChange: (module: AuditModule) => void;
}) {
  return (
    <nav
      aria-label='Audit log modules'
      className='-mb-px w-full min-w-0 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
    >
      <div className='flex w-max min-w-0'>
        {AUDIT_MODULE_TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type='button'
              role='tab'
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={cn(
                'shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
