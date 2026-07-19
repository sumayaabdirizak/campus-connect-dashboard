'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet';
import { courseColor } from '@/features/student-courses/lib/course-color';
import { CourseCoverDialog } from './course-cover-dialog';
import { CourseTabNav } from '@/features/course-details/components/_shared/course-tab-nav';
import { CourseChat } from '@/features/course-details/components/course-chat';
import type { CourseTabDef, CourseTabId } from '@/features/course-details/config/course-tabs';
import { CourseHeaderBanner } from './course-detail-header/course-header-banner';
import { CourseHeaderCompact } from './course-detail-header/course-header-compact';

export interface CourseDetailHeaderProps {
  course: { code: string; name: string; department: { name: string }; thumbnail?: string | null };
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
  onExpand
}: CourseDetailHeaderProps) {
  const [coverOpen, setCoverOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const canEditCover = !isStudent && Boolean(offeringId);

  const accentColor = courseColor(course.code);
  const coverUrl = course.thumbnail ?? null;

  return (
    <>
      <header
        data-course-header
        className={cn(
          'z-10 w-full min-w-0 max-w-full shrink-0 overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-shadow duration-200',
          compact && 'shadow-md'
        )}
      >
        {compact ? (
          <CourseHeaderCompact
            course={course}
            canEditCover={canEditCover}
            onExpand={onExpand}
            onOpenChat={() => setChatOpen(true)}
            onOpenCover={() => setCoverOpen(true)}
          />
        ) : (
          <CourseHeaderBanner
            course={course}
            section={section}
            batch={batch}
            isStudent={isStudent}
            canEditCover={canEditCover}
            accentColor={accentColor}
            coverUrl={coverUrl}
            onOpenChat={() => setChatOpen(true)}
            onOpenCover={() => setCoverOpen(true)}
          />
        )}

        <div className={cn('min-w-0 px-4 sm:px-6', compact ? 'pt-1.5' : 'mt-2')}>
          <CourseTabNav
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            badges={tabBadges}
          />
        </div>
      </header>

      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent side='right' className='flex w-full flex-col p-0 sm:max-w-lg'>
          <SheetHeader className='border-b px-4 py-4 text-left'>
            <SheetTitle>Course chat</SheetTitle>
            <SheetDescription>Real-time discussion for {course.code}</SheetDescription>
          </SheetHeader>
          <div className='min-h-0 flex-1 overflow-hidden'>
            {offeringId && <CourseChat courseId={offeringId} isStudent={isStudent ?? false} />}
          </div>
        </SheetContent>
      </Sheet>

      {canEditCover && offeringId && (
        <CourseCoverDialog
          offeringId={offeringId}
          currentCover={course.thumbnail}
          open={coverOpen}
          onOpenChange={setCoverOpen}
        />
      )}
    </>
  );
}
