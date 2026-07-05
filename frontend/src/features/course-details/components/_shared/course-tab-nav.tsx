'use client';

import { cn } from '@/lib/utils';
import type { CourseTabDef, CourseTabId } from '../../config/course-tabs';

interface CourseTabNavProps {
  tabs: CourseTabDef[];
  activeTab: CourseTabId;
  onTabChange: (tab: CourseTabId) => void;
  /** Optional badge counts keyed by tab id (e.g. pending reviews) */
  badges?: Partial<Record<CourseTabId, number>>;
}

/** Minimal text tabs — no icons, thin underline, compact spacing. */
export function CourseTabNav({ tabs, activeTab, onTabChange, badges }: CourseTabNavProps) {
  return (
    <nav
      className='-mb-px w-full max-w-full min-w-0 overflow-x-auto overscroll-x-contain border-b border-border/50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
      aria-label='Course sections'
    >
      <div className='flex w-max min-w-0'>
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          const badge = badges?.[tab.id];

          return (
            <button
              key={tab.id}
              type='button'
              role='tab'
              aria-selected={active}
              aria-controls={`course-panel-${tab.id}`}
              id={`course-tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'relative shrink-0 border-b px-2.5 py-2 text-sm transition-colors sm:px-3',
                active
                  ? 'border-foreground font-medium text-foreground'
                  : 'border-transparent font-normal text-muted-foreground hover:text-foreground'
              )}
            >
              <span className='whitespace-nowrap'>{tab.label}</span>
              {badge != null && badge > 0 ? (
                <span
                  className={cn(
                    'ml-1 tabular-nums',
                    active ? 'text-foreground/70' : 'text-muted-foreground/80'
                  )}
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
