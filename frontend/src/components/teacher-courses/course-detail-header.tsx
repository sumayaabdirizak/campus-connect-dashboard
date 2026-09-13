'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/features/ui/components/sheet';
import { CourseCoverDialog } from './course-cover-dialog';
import { CourseTabNav } from '@/components/course-details/_shared/course-tab-nav';
import { CourseChat } from '@/components/course-details/course-chat';
import type { CourseTabDef, CourseTabId } from '@/lib/course-details/config/course-tabs';
import { CourseHeaderBanner } from './course-detail-header/course-header-banner';
import { CourseHeaderCompact } from './course-detail-header/course-header-compact';

export interface CourseDetailHeaderProps {
  course: {
    code: string;
    name: string;
    department: { name: string };
    thumbnail?: string | null;
  };
  section: { name: string };
  batch: { name: string };
  tabs: CourseTabDef[];
  activeTab: CourseTabId;
  setActiveTab: (tab: CourseTabId) => void;
  tabBadges?: Partial<Record<CourseTabId, number>>;
  isStudent?: boolean;
  offeringId?: string;
  /** When true, show the compact header bar. Defaults to collapsed. */
  compact?: boolean;
  onCompactChange?: (compact: boolean) => void;
}

export function CourseDetailHeader({
  course,
  section,
  batch,
  tabs,
  activeTab,
  setActiveTab,
  tabBadges,
  isStudent,
  offeringId,
  compact = true,
  onCompactChange,
}: CourseDetailHeaderProps) {
  const [coverOpen, setCoverOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [internalCompact, setInternalCompact] = useState(compact);
  const canEditCover = !isStudent && Boolean(offeringId);
  const coverUrl = course.thumbnail ?? null;

  const isControlled = onCompactChange != null;
  const showCompact = isControlled ? compact : internalCompact;

  const setCompact = (next: boolean) => {
    if (isControlled) onCompactChange(next);
    else setInternalCompact(next);
  };

  const handleToggleCollapse = () => setCompact(!showCompact);
  const handleExpand = () => setCompact(false);

  return (
    <>
      <header
        data-course-header
        className={cn(
          'z-10 w-full min-w-0 max-w-full shrink-0 overflow-hidden rounded-xl border border-border bg-card transition-all',
          showCompact && 'shadow-sm'
        )}
      >
        {showCompact ? (
          <CourseHeaderCompact
            course={course}
            canEditCover={canEditCover}
            onExpand={handleExpand}
            onOpenChat={() => setChatOpen(true)}
            onOpenCover={() => setCoverOpen(true)}
            isCollapsed={true}
            onToggleCollapse={handleToggleCollapse}
          />
        ) : (
          <CourseHeaderBanner
            course={course}
            section={section}
            batch={batch}
            isStudent={isStudent}
            canEditCover={canEditCover}
            coverUrl={coverUrl}
            onOpenChat={() => setChatOpen(true)}
            onOpenCover={() => setCoverOpen(true)}
            isCollapsed={false}
            onToggleCollapse={handleToggleCollapse}
          />
        )}

        <div
          className={cn(
            'min-w-0 px-4 sm:px-5',
            showCompact ? 'pt-2' : 'border-t border-border'
          )}
        >
          <CourseTabNav
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            badges={tabBadges}
          />
        </div>
      </header>

      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent
          side='right'
          className='flex w-full flex-col gap-0 border-l border-border bg-card p-0 sm:max-w-lg'
        >
          <SheetTitle className='sr-only'>
            {course.code} course chat
          </SheetTitle>
          <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
            {offeringId ? (
              <CourseChat
                courseId={offeringId}
                isStudent={isStudent ?? false}
                courseCode={course.code}
                variant='sheet'
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      {canEditCover && offeringId ? (
        <CourseCoverDialog
          offeringId={offeringId}
          currentCover={course.thumbnail}
          open={coverOpen}
          onOpenChange={setCoverOpen}
        />
      ) : null}
    </>
  );
}
