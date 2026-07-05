'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  ImagePlus,
  Layers,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet';
import { NotificationToggle } from '@/features/notifications/notification-toggle';
import { courseColor } from '@/features/student-courses/lib/course-color';
import { CourseCoverDialog } from './course-cover-dialog';
import { CourseTabNav } from '@/features/course-details/components/_shared/course-tab-nav';
import { CourseChat } from '@/features/course-details/components/course-chat';
import type { CourseTabDef, CourseTabId } from '@/features/course-details/config/course-tabs';

interface CourseDetailHeaderProps {
  course: { code: string; name: string; department: { name: string }; thumbnail?: string | null };
  section: { name: string };
  batch: { name: string };
  tabs: CourseTabDef[];
  activeTab: CourseTabId;
  setActiveTab: (tab: CourseTabId) => void;
  tabBadges?: Partial<Record<CourseTabId, number>>;
  isStudent?: boolean;
  offeringId?: string;
  /** Hides banner and title; tabs stay the same */
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

  const bannerActionClass =
    'border-0 bg-white/95 text-foreground shadow-sm hover:bg-white hover:text-foreground [&_svg]:text-foreground';

  const headerActions = (
    <>
      <Button
        type='button'
        size='sm'
        variant={compact ? 'ghost' : 'secondary'}
        className={cn(
          'size-8 shrink-0 gap-0 p-0 sm:h-8 sm:w-auto sm:gap-1.5 sm:px-2.5 sm:text-xs',
          !compact && bannerActionClass
        )}
        onClick={() => setChatOpen(true)}
        aria-label='Course chat'
      >
        <MessageSquare className='size-3.5 sm:size-4' aria-hidden />
        <span className='hidden sm:inline'>Chat</span>
      </Button>
      {canEditCover && (
        <Button
          type='button'
          size='sm'
          variant={compact ? 'ghost' : 'secondary'}
          className={cn(
            'size-8 shrink-0 gap-0 p-0 sm:h-8 sm:w-auto sm:gap-1.5 sm:px-2.5 sm:text-xs',
            !compact && bannerActionClass
          )}
          onClick={() => setCoverOpen(true)}
          aria-label='Change cover image'
        >
          <ImagePlus className='size-3.5 sm:size-4' aria-hidden />
          <span className='hidden sm:inline'>Cover</span>
        </Button>
      )}
      <div className={cn('shrink-0 text-foreground', !compact && 'rounded-md bg-white/95 p-0.5 shadow-sm')}>
        <NotificationToggle compact />
      </div>
    </>
  );

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
          <div className='flex min-w-0 items-center gap-2 border-b border-border/60 px-3 py-2 sm:px-4'>
            <Link
              href='/dashboard/courses'
              className='inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
              aria-label='Back to courses'
            >
              <ArrowLeft className='size-4' aria-hidden />
            </Link>
            <button
              type='button'
              onClick={onExpand}
              className='min-w-0 truncate text-left text-sm font-semibold transition-colors hover:text-primary'
              title='Show full course header'
            >
              <span className='text-primary'>{course.code}</span>
              <span className='mx-1.5 text-muted-foreground/60'>·</span>
              <span className='text-foreground'>{course.name}</span>
            </button>
            <div className='ml-auto flex shrink-0 items-center gap-0.5'>{headerActions}</div>
          </div>
        ) : (
          <>
            <div className='relative h-24 sm:h-28 md:h-32'>
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt=''
                  className='absolute inset-0 h-full w-full object-cover'
                />
              ) : (
                <div
                  className='absolute inset-0'
                  style={{
                    background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 45%, ${accentColor}88 100%)`
                  }}
                />
              )}
              <div className='absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent' />

              <div className='relative flex h-full min-w-0 flex-col justify-between p-3 sm:p-4 md:p-5'>
                <div className='flex min-w-0 items-start justify-between gap-2'>
                  <Link
                    href='/dashboard/courses'
                    className='inline-flex shrink-0 items-center gap-1.5 rounded-md bg-black/25 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/40'
                  >
                    <ArrowLeft className='size-3.5' aria-hidden />
                    <span className='sr-only sm:not-sr-only sm:inline'>Courses</span>
                  </Link>
                  <div className='flex shrink-0 items-center gap-1 sm:gap-1.5'>{headerActions}</div>
                </div>
              </div>
            </div>

            <div className='min-w-0 px-4 pt-3 sm:px-6 sm:pt-4'>
              <div className='mb-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground'>
                <span className='truncate'>{course.department.name}</span>
                <ChevronRight className='size-3 shrink-0' aria-hidden />
                <span className='inline-flex min-w-0 items-center gap-1 truncate'>
                  <Layers className='size-3 shrink-0' aria-hidden />
                  <span className='truncate'>
                    {batch.name} · {section.name}
                  </span>
                </span>
              </div>
              <h1 className='truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl md:text-2xl'>
                <span className='text-primary'>{course.code}</span>
                <span className='mx-1.5 text-muted-foreground/60 sm:mx-2'>·</span>
                <span>{course.name}</span>
              </h1>
              <p className='mt-1 flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm'>
                <Building2 className='size-3.5 shrink-0' aria-hidden />
                {isStudent ? 'Student view' : 'Instructor view'}
              </p>
            </div>
          </>
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
