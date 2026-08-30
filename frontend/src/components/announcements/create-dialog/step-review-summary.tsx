'use client';

import { Icons } from '@/components/icons';
import type { AnnouncementPriority, AnnouncementTargetType } from '@/lib/announcements/types';
import type { ActiveDaysPreset } from './types';
import { computeExpiresIsoFromPreset, dialogFieldsetClass, dialogLegendClass, htmlToPlain } from './utils';

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
    if (activeDaysPreset === 'custom') {
      return expiresAtCustom.trim()
        ? new Date(expiresAtCustom).toLocaleString()
        : 'Custom date not set';
    }
    if (activeDaysPreset === 'off') return 'No limit';
    const iso = computeExpiresIsoFromPreset(activeDaysPreset);
    return iso ? new Date(iso).toLocaleString() : '—';
  })();

  const rows: { label: string; value: string; warn?: boolean }[] = [
    { label: 'Title', value: title.trim() || '—' },
    {
      label: 'Message',
      value: !plain ? '—' : plain.length > 80 ? `${plain.slice(0, 80)}…` : plain,
    },
    ...(imageCount > 0 ? [{ label: 'Images', value: `${imageCount} attached` }] : []),
    {
      label: 'Audience',
      value: previewLoading
        ? 'Calculating…'
        : audiencePreview
          ? `${audiencePreview.count} recipient${audiencePreview.count === 1 ? '' : 's'} · ${reachLabel}`
          : '—',
    },
    {
      label: 'Roles',
      value:
        [includeStudents && 'Students', includeTeachers && 'Teachers'].filter(Boolean).join(' + ') ||
        '—',
    },
    { label: 'Priority', value: priority },
    { label: 'Pinned until', value: activeUntil },
    ...(deadlineAtLocal
      ? [{ label: 'Calendar deadline', value: new Date(deadlineAtLocal).toLocaleString() }]
      : []),
  ];

  return (
    <section aria-labelledby='review-summary-heading' className={dialogFieldsetClass}>
      <div className='flex items-center gap-2.5'>
        <div className='flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
          <Icons.send className='size-4' aria-hidden />
        </div>
        <div>
          <h3 id='review-summary-heading' className={dialogLegendClass}>
            Ready to post?
          </h3>
          <p className='text-xs text-muted-foreground'>Double-check everything below.</p>
        </div>
      </div>
      <dl className='divide-y divide-foreground/10 rounded-lg border-2 border-foreground/10 bg-background'>
        {rows.map((row) => (
          <div
            key={row.label}
            className='flex items-start justify-between gap-4 px-4 py-3 text-sm'
          >
            <dt className='shrink-0 font-semibold text-foreground/65'>{row.label}</dt>
            <dd
              className={`min-w-0 text-end font-semibold ${
                row.warn ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'
              }`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      {audiencePreview && audiencePreview.count === 0 ? (
        <p
          role='alert'
          className='rounded-lg border border-amber-500/50 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
        >
          No one matches this audience. Go back and widen your reach before posting.
        </p>
      ) : null}
    </section>
  );
}
