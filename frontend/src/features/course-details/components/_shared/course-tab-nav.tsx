'use client';

import { cn } from '@/lib/utils';
import { pastelForTab } from '@/lib/pastel';
import type { CourseTabDef, CourseTabId } from '../../config/course-tabs';

interface CourseTabNavProps {
  tabs: CourseTabDef[];
  activeTab: CourseTabId;
  onTabChange: (tab: CourseTabId) => void;
  /** Optional badge counts keyed by tab id (e.g. pending reviews) */
  badges?: Partial<Record<CourseTabId, number>>;
}

/**
 * Pastel-campus tab bar: each tab owns a fixed hue (see `pastelForTab`), so
 * the navigation doubles as the page's color legend. The active tab becomes
 * a soft pill in its hue; inactive tabs stay quiet until hover.
 */
export function CourseTabNav({ tabs, activeTab, onTabChange, badges }: CourseTabNavProps) {
  return (
    <nav
      className='w-full max-w-full min-w-0 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
      aria-label='Course sections'
    >
      <div className='flex w-max min-w-0 items-center gap-1.5'>
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          const badge = badges?.[tab.id];
          const hue = pastelForTab(tab.id);
          const Icon = tab.icon;

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
                'relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-all',
                active
                  ? cn(hue.chip, 'font-semibold shadow-sm')
                  : 'font-normal text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              )}
            >
              <Icon className='size-3.5 shrink-0' aria-hidden />
              <span className='whitespace-nowrap'>{tab.label}</span>
              {badge != null && badge > 0 ? (
                <span
                  className={cn(
                    'inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums',
                    active ? 'bg-white/60 dark:bg-black/25' : cn(hue.chip)
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
