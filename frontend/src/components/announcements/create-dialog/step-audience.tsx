'use client';

import { Checkbox } from '@/features/ui/components/checkbox';
import { cn } from '@/lib/utils';
import { ChipPicker } from '../chip-picker';
import { AudiencePreviewCard } from './audience-preview';
import type { AnnouncementTargetType } from '@/lib/announcements/types';
import type { ChipOption, DeanBatchLite } from './types';
import {
  dialogFieldsetClass,
  dialogHintClass,
  dialogLegendClass,
  dialogSegmentGroupClass,
  segmentedClass,
} from './utils';

type Preview = {
  count: number;
  shardCount?: number;
  sample: { name: string }[];
} | null;

type Props = {
  isDean: boolean;
  targetType: AnnouncementTargetType;
  setTargetType: (v: AnnouncementTargetType) => void;
  selectedDepartments: string[];
  selectedBatches: string[];
  selectedSections: string[];
  setSelectedDepartments: (ids: string[] | ((prev: string[]) => string[])) => void;
  setSelectedBatches: (ids: string[] | ((prev: string[]) => string[])) => void;
  setSelectedSections: (ids: string[] | ((prev: string[]) => string[])) => void;
  departmentOptions: ChipOption[];
  batchOptions: ChipOption[];
  sectionOptions: ChipOption[];
  deanBatches: DeanBatchLite[];
  includeStudents: boolean;
  includeTeachers: boolean;
  setIncludeStudents: (v: boolean) => void;
  setIncludeTeachers: (v: boolean) => void;
  previewReady: boolean;
  previewLoading: boolean;
  audiencePreview: Preview;
};

export function StepAudience(props: Props) {
  const {
    isDean,
    targetType,
    setTargetType,
    selectedDepartments,
    selectedBatches,
    selectedSections,
    setSelectedDepartments,
    setSelectedBatches,
    setSelectedSections,
    departmentOptions,
    batchOptions,
    sectionOptions,
    deanBatches,
    includeStudents,
    includeTeachers,
    setIncludeStudents,
    setIncludeTeachers,
    previewReady,
    previewLoading,
    audiencePreview,
  } = props;

  const targetTypeOptions: { value: AnnouncementTargetType; label: string; hint: string }[] = [
    ...((!isDean
      ? [{ value: 'ALL' as AnnouncementTargetType, label: 'Everyone', hint: 'Whole university' }]
      : []) as { value: AnnouncementTargetType; label: string; hint: string }[]),
    { value: 'DEPARTMENT', label: 'Departments', hint: 'One or more' },
    { value: 'BATCH', label: 'Batches', hint: 'Student cohorts' },
    { value: 'SECTION', label: 'Sections', hint: 'Smallest groups' },
  ];

  return (
    <div className='space-y-4'>
      <fieldset className={dialogFieldsetClass}>
        <legend className={dialogLegendClass}>Who should see this?</legend>
        <p className={dialogHintClass}>Pick the widest group that still fits your message.</p>
        <div
          role='radiogroup'
          aria-label='Reach scope'
          className={cn(
            dialogSegmentGroupClass,
            'grid grid-cols-2 sm:grid-cols-4',
          )}
        >
          {targetTypeOptions.map((opt) => {
            const active = targetType === opt.value;
            return (
              <button
                key={opt.value}
                type='button'
                role='radio'
                aria-checked={active}
                onClick={() => {
                  setTargetType(opt.value);
                  if (opt.value === 'ALL' || opt.value === 'FACULTY') {
                    setSelectedDepartments([]);
                    setSelectedBatches([]);
                    setSelectedSections([]);
                  } else if (opt.value === 'DEPARTMENT') {
                    setSelectedBatches([]);
                    setSelectedSections([]);
                  } else if (opt.value === 'BATCH') {
                    setSelectedSections([]);
                  }
                }}
                className={`${segmentedClass(active)} flex-col items-start gap-0.5 px-2.5 py-2.5 text-start`}
              >
                <span className='text-sm font-semibold leading-tight'>{opt.label}</span>
                <span
                  className={cn(
                    'text-[11px] font-normal leading-tight',
                    active ? 'text-primary-foreground/85' : 'text-muted-foreground',
                  )}
                >
                  {opt.hint}
                </span>
              </button>
            );
          })}
        </div>

        {(targetType === 'DEPARTMENT' || targetType === 'BATCH' || targetType === 'SECTION') && (
          <div className='space-y-3 border-t border-border pt-3'>
            <ChipPicker
              label='Departments'
              placeholder={
                departmentOptions.length === 0
                  ? 'No departments in your faculty yet'
                  : 'Pick one or more departments'
              }
              options={departmentOptions}
              value={selectedDepartments}
              onChange={(ids) => {
                setSelectedDepartments(ids);
                const allowed = new Set(ids);
                setSelectedBatches((prev) => {
                  const next = prev.filter((b) => {
                    const batch = deanBatches.find((db) => String(db.id) === b);
                    const dep = batch?.program?.department?.id ?? batch?.program?.departmentId;
                    return dep != null && allowed.has(String(dep));
                  });
                  if (next.length !== prev.length) setSelectedSections([]);
                  return next;
                });
              }}
            />
          </div>
        )}

        {(targetType === 'BATCH' || targetType === 'SECTION') && (
          <ChipPicker
            label='Batches'
            placeholder={
              selectedDepartments.length === 0
                ? 'Pick a department first'
                : 'Pick one or more batches'
            }
            emptyMessage='No batches in the chosen departments'
            options={batchOptions}
            value={selectedBatches}
            onChange={(ids) => {
              setSelectedBatches(ids);
              const allowed = new Set(ids);
              setSelectedSections((prev) =>
                prev.filter((s) => {
                  const opt = sectionOptions.find((so) => so.id === s);
                  return Boolean(opt) && allowed.size > 0;
                }),
              );
            }}
          />
        )}

        {targetType === 'SECTION' && (
          <ChipPicker
            label='Sections'
            placeholder={
              selectedBatches.length === 0 ? 'Pick a batch first' : 'Pick one or more sections'
            }
            emptyMessage='No sections in the chosen batches'
            options={sectionOptions}
            value={selectedSections}
            onChange={setSelectedSections}
          />
        )}
      </fieldset>

      <fieldset className={dialogFieldsetClass}>
        <legend className={dialogLegendClass}>Which roles?</legend>
        <p className={dialogHintClass}>
          Both are selected by default. Uncheck to hide the post from that group.
        </p>
        <div className='flex flex-col gap-3 rounded-lg border-2 border-foreground/10 bg-background px-4 py-3'>
          <label className='flex cursor-pointer items-center gap-3 text-sm font-medium text-foreground'>
            <Checkbox
              checked={includeStudents}
              onCheckedChange={(v) => {
                const next = v === true;
                if (!next && !includeTeachers) return;
                setIncludeStudents(next);
              }}
              aria-label='Include students'
            />
            <span>Students</span>
          </label>
          <label className='flex cursor-pointer items-center gap-3 text-sm font-medium text-foreground'>
            <Checkbox
              checked={includeTeachers}
              onCheckedChange={(v) => {
                const next = v === true;
                if (!next && !includeStudents) return;
                setIncludeTeachers(next);
              }}
              aria-label='Include teachers'
            />
            <span>Teachers</span>
          </label>
        </div>
      </fieldset>

      <AudiencePreviewCard
        previewReady={previewReady}
        previewLoading={previewLoading}
        audiencePreview={audiencePreview}
      />
    </div>
  );
}
