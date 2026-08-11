'use client';

import { Checkbox } from '@/features/ui/components/checkbox';
import { ChipPicker } from '../chip-picker';
import { AudiencePreviewCard } from './audience-preview';
import type { AnnouncementTargetType } from '@/lib/announcements/types';
import type { ChipOption, DeanBatchLite } from './types';
import { segmentedClass } from './utils';

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
      ? [{ value: 'ALL' as AnnouncementTargetType, label: 'Everyone', hint: 'University-wide' }]
      : []) as { value: AnnouncementTargetType; label: string; hint: string }[]),
    { value: 'DEPARTMENT', label: 'Departments', hint: 'Pick one or many' },
    { value: 'BATCH', label: 'Batches', hint: 'Across departments' },
    { value: 'SECTION', label: 'Sections', hint: 'Most specific' },
  ];

  return (
    <div className='space-y-6'>
      <fieldset className='space-y-3'>
        <legend className='text-xs font-medium text-foreground'>Reach</legend>
        <div
          role='radiogroup'
          aria-label='Reach scope'
          className='grid grid-cols-2 gap-1 rounded-xl border border-input bg-muted/50 p-1 sm:grid-cols-4'
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
                className={`${segmentedClass(active)} flex-col items-start gap-0 px-2.5 py-2 text-start`}
              >
                <span className='text-[12px] font-semibold leading-tight'>{opt.label}</span>
                <span className='text-[10px] font-normal text-muted-foreground'>{opt.hint}</span>
              </button>
            );
          })}
        </div>

        {(targetType === 'DEPARTMENT' || targetType === 'BATCH' || targetType === 'SECTION') && (
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

      <fieldset className='space-y-3'>
        <legend className='text-xs font-medium text-foreground'>Visible to</legend>
        <p className='text-[11px] text-muted-foreground'>
          By default everyone in your reach sees the post. Uncheck a group to exclude them.
        </p>
        <div className='flex flex-col gap-3 rounded-xl border border-input bg-muted/30 px-4 py-3'>
          <label className='flex cursor-pointer items-center gap-3 text-sm'>
            <Checkbox
              checked={includeStudents}
              onCheckedChange={(v) => setIncludeStudents(v === true)}
              aria-label='Include students'
            />
            <span>Students</span>
          </label>
          <label className='flex cursor-pointer items-center gap-3 text-sm'>
            <Checkbox
              checked={includeTeachers}
              onCheckedChange={(v) => setIncludeTeachers(v === true)}
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
