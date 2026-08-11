'use client';

import { Icons } from '@/components/icons';
import type { AnnouncementPriority, AnnouncementTargetType } from '@/lib/announcements/types';
import type { ActiveDaysPreset } from './types';
import { computeExpiresIsoFromPreset, htmlToPlain } from './utils';

type Preview = { count: number } | null | undefined;

type Props = {
  title: string;
  content: string;
  imageCount: number;
  targetType: AnnouncementTargetType;
  selectedDepartments: string[];
  selectedBatches: string[];
  selectedSections: string[];
  includeStudents: boolean;
  includeTeachers: boolean;
  priority: AnnouncementPriority;
  activeDaysPreset: ActiveDaysPreset;
  expiresAtCustom: string;
  deadlineAtLocal: string;
  isEditMode: boolean;
  notifySms: boolean;
  previewLoading: boolean;
  audiencePreview: Preview;
};

export function StepReviewSummary(props: Props) {
  const {
    title,
    content,
    imageCount,
    targetType,
    selectedDepartments,
    selectedBatches,
    selectedSections,
    includeStudents,
    includeTeachers,
    priority,
    activeDaysPreset,
    expiresAtCustom,
    deadlineAtLocal,
    isEditMode,
    notifySms,
    previewLoading,
    audiencePreview,
  } = props;

  const plain = htmlToPlain(content);
  const reachLabel =
    targetType === 'ALL'
      ? 'Everyone'
      : targetType === 'FACULTY'
        ? 'Faculty'
        : targetType === 'DEPARTMENT'
          ? `${selectedDepartments.length} dept${selectedDepartments.length === 1 ? '' : 's'}`
          : targetType === 'BATCH'
            ? `${selectedBatches.length} batch${selectedBatches.length === 1 ? '' : 'es'}`
            : `${selectedSections.length} section${selectedSections.length === 1 ? '' : 's'}`;

  const activeUntil = (() => {
    if (expiresAtCustom.trim()) return new Date(expiresAtCustom).toLocaleString();
    if (activeDaysPreset === 'off') return 'No active-days limit';
    const iso = computeExpiresIsoFromPreset(activeDaysPreset);
    return iso ? new Date(iso).toLocaleString() : '—';
  })();

  return (
    <section
      aria-labelledby='review-summary-heading'
      className='space-y-3 rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-background to-background p-4'
    >
      <div className='flex items-center gap-2'>
        <div className='flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
          <Icons.send className='size-4' aria-hidden />
        </div>
        <h3 id='review-summary-heading' className='text-sm font-semibold text-foreground'>
          Review before posting
        </h3>
      </div>
      <dl className='grid gap-2 text-xs'>
        <div className='flex items-start justify-between gap-3'>
          <dt className='text-muted-foreground'>Title</dt>
          <dd className='max-w-[60%] truncate text-end font-medium text-foreground'>
            {title.trim() || '—'}
          </dd>
        </div>
        <div className='flex items-start justify-between gap-3'>
          <dt className='text-muted-foreground'>Message</dt>
          <dd className='max-w-[60%] text-end text-muted-foreground'>
            {!plain ? '—' : plain.length > 80 ? `${plain.slice(0, 80)}…` : plain}
          </dd>
        </div>
        {imageCount > 0 ? (
          <div className='flex items-center justify-between gap-3'>
            <dt className='text-muted-foreground'>Images</dt>
            <dd className='font-medium text-foreground'>{imageCount} attached</dd>
          </div>
        ) : null}
        <div className='flex items-center justify-between gap-3'>
          <dt className='text-muted-foreground'>Audience</dt>
          <dd className='text-end font-medium text-foreground'>
            {previewLoading
              ? 'Calculating…'
              : audiencePreview
                ? `${audiencePreview.count} recipient${audiencePreview.count === 1 ? '' : 's'}`
                : '—'}
            <span className='ms-1 font-normal text-muted-foreground'>· {reachLabel}</span>
          </dd>
        </div>
        <div className='flex items-center justify-between gap-3'>
          <dt className='text-muted-foreground'>Roles</dt>
          <dd className='font-medium text-foreground'>
            {[includeStudents && 'Students', includeTeachers && 'Teachers']
              .filter(Boolean)
              .join(' + ') || '—'}
          </dd>
        </div>
        <div className='flex items-center justify-between gap-3'>
          <dt className='text-muted-foreground'>Priority</dt>
          <dd className='font-medium capitalize text-foreground'>{priority}</dd>
        </div>
        <div className='flex items-center justify-between gap-3'>
          <dt className='text-muted-foreground'>Active until</dt>
          <dd className='font-medium text-foreground'>{activeUntil}</dd>
        </div>
        {deadlineAtLocal ? (
          <div className='flex items-center justify-between gap-3'>
            <dt className='text-muted-foreground'>Calendar deadline</dt>
            <dd className='font-medium text-foreground'>
              {new Date(deadlineAtLocal).toLocaleString()}
            </dd>
          </div>
        ) : null}
        {!isEditMode && notifySms ? (
          <div className='flex items-center justify-between gap-3'>
            <dt className='text-muted-foreground'>SMS alert</dt>
            <dd className='font-medium text-amber-600 dark:text-amber-400'>Will send via Twilio</dd>
          </div>
        ) : null}
      </dl>
      {audiencePreview && audiencePreview.count === 0 ? (
        <p
          role='alert'
          className='rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400'
        >
          No active users match this targeting. Go back to step 2 and widen the reach before
          publishing.
        </p>
      ) : null}
    </section>
  );
}
