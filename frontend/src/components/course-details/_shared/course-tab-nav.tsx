'use client';

import {
  ClipboardCheck,
  FileText,
  FolderOpen,
  GraduationCap,
  MessageSquare,
  Newspaper,
  UserCheck,
  Users
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CourseTabDef, CourseTabId } from '@/lib/course-details/config/course-tabs';

const TAB_ICONS: Record<CourseTabId, LucideIcon> = {
  overview: FileText,
  announcements: Newspaper,
  feed: Newspaper,
  assignments: FileText,
  quizzes: ClipboardCheck,
  resources: FolderOpen,
  groups: Users,
  roster: UserCheck,
  grades: GraduationCap,
  chat: MessageSquare
};

interface CourseTabNavProps {
  tabs: CourseTabDef[];
  activeTab: CourseTabId;
  onTabChange: (tab: CourseTabId) => void;
  badges?: Partial<Record<CourseTabId, number>>;
}

export function CourseTabNav({ tabs, activeTab, onTabChange, badges }: CourseTabNavProps) {
  return (
    <nav
      className='w-full max-w-full min-w-0 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
      aria-label='Course sections'
    >
      <div className='flex w-max min-w-0 items-center gap-6'>
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          const badge = badges?.[tab.id];
          const Icon = TAB_ICONS[tab.id];

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
                'relative flex shrink-0 items-center gap-1.5 border-b-2 py-3 text-sm transition-colors',
                active
                  ? 'border-primary font-semibold text-primary'
                  : 'border-transparent font-medium text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className='size-4 shrink-0' aria-hidden />
              <span className='whitespace-nowrap'>{tab.label}</span>
              {badge != null && badge > 0 ? (
                <span className='inline-flex min-w-[18px] items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] font-semibold tabular-nums text-primary'>
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

export default CourseTabNav;
