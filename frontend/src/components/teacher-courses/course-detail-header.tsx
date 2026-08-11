'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
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
  compact?: boolean;
  onExpand?: () => void;
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
  compact = false,
  onExpand,
}: CourseDetailHeaderProps) {
  const [coverOpen, setCoverOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(compact);
  const canEditCover = !isStudent && Boolean(offeringId);
  const coverUrl = course.thumbnail ?? null;

  const showCompact = isCollapsed || compact;
  const handleToggleCollapse = () => setIsCollapsed((prev) => !prev);

  return (
    <>
      <header
        data-course-header
        className={cn(
          'z-10 w-full min-w-0 max-w-full shrink-0 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white transition-all',
          showCompact && 'shadow-sm'
        )}
      >
        {showCompact ? (
          <CourseHeaderCompact
            course={course}
            canEditCover={canEditCover}
            onExpand={onExpand ?? handleToggleCollapse}
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

        <div className={cn('min-w-0 px-4 sm:px-5', compact ? 'pt-1' : 'border-t border-[#E5E7EB]')}>
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
          className='flex w-full flex-col gap-0 border-l border-[#E5E7EB] bg-white p-0 sm:max-w-lg'
        >
          <SheetHeader className='shrink-0 space-y-1 border-b border-[#E5E7EB] px-4 py-4 text-left'>
            <SheetTitle className='text-base font-semibold tracking-tight text-[#101828]'>
              Course chat
            </SheetTitle>
            <SheetDescription className='text-sm text-[#667085]'>
              Real-time discussion for {course.code}
            </SheetDescription>
          </SheetHeader>
          <div className='min-h-0 flex-1 overflow-hidden'>
            {offeringId ? (
              <CourseChat courseId={offeringId} isStudent={isStudent ?? false} />
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
