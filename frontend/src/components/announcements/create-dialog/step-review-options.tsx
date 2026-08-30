'use client';

import { Input } from '@/features/ui/components/input';
import { Label } from '@/features/ui/components/label';
import { Icons } from '@/components/icons';
import type { AnnouncementPriority } from '@/lib/announcements/types';
import type { ActiveDaysPreset } from './types';
import {
  dialogFieldsetClass,
  dialogHintClass,
  dialogInputClass,
  dialogLegendClass,
  dialogSegmentGroupClass,
  segmentedClass,
} from './utils';

type Props = {
  priority: AnnouncementPriority;
  setPriority: (v: AnnouncementPriority) => void;
  activeDaysPreset: ActiveDaysPreset;
  setActiveDaysPreset: (v: ActiveDaysPreset) => void;
  expiresAtCustom: string;
  setExpiresAtCustom: (v: string) => void;
  deadlineAtLocal: string;
  setDeadlineAtLocal: (v: string) => void;
};

export function StepReviewOptions({
  priority,
  setPriority,
  activeDaysPreset,
  setActiveDaysPreset,
  expiresAtCustom,
  setExpiresAtCustom,
  deadlineAtLocal,
  setDeadlineAtLocal,
}: Props) {
  return (
    <div className='space-y-4'>
      <fieldset className={dialogFieldsetClass}>
        <legend className={dialogLegendClass}>Priority</legend>
        <p className={dialogHintClass}>
          Normal for everyday updates. Use Important or Urgent only when people must act quickly.
        </p>
        <div role='radiogroup' aria-label='Priority' className={dialogSegmentGroupClass}>
          {(
            [
              { value: 'normal' as const, label: 'Normal', icon: null },
              { value: 'important' as const, label: 'Important', icon: Icons.info },
              { value: 'urgent' as const, label: 'Urgent', icon: Icons.warning },
            ] as const
          ).map((opt) => {
            const active = priority === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type='button'
                role='radio'
                aria-checked={active}
                onClick={() => setPriority(opt.value)}
                className={segmentedClass(active)}
              >
                <span className='inline-flex items-center justify-center gap-1.5'>
                  {Icon ? <Icon className='size-3.5' aria-hidden /> : null}
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className={dialogFieldsetClass}>
        <legend className={dialogLegendClass}>How long stays at the top?</legend>
        <p className={dialogHintClass}>
          Pinned announcements sort to the top for the chosen period, then stay in the feed in normal
          order.
        </p>
        <div className={dialogSegmentGroupClass}>
          {(
            [
              { value: 'off' as const, label: 'No limit' },
              { value: '1' as const, label: '1 day' },
              { value: '3' as const, label: '3 days' },
              { value: '5' as const, label: '5 days' },
              { value: 'custom' as const, label: 'Custom' },
            ] as const
          ).map((opt) => {
            const active = activeDaysPreset === opt.value;
            return (
              <button
                key={opt.value}
                type='button'
                onClick={() => {
                  setActiveDaysPreset(opt.value);
                  if (opt.value !== 'custom') setExpiresAtCustom('');
                }}
                className={segmentedClass(active)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {activeDaysPreset === 'custom' ? (
          <div className='space-y-1.5 border-t border-border pt-3'>
            <Label htmlFor='expires-custom' className='text-sm font-medium text-foreground'>
              End date & time
            </Label>
            <Input
              id='expires-custom'
              type='datetime-local'
              value={expiresAtCustom}
              onChange={(e) => setExpiresAtCustom(e.target.value)}
              className={dialogInputClass}
            />
          </div>
        ) : null}
      </fieldset>

      <fieldset className={dialogFieldsetClass}>
        <legend className={dialogLegendClass}>Calendar deadline</legend>
        <p className={dialogHintClass}>
          Optional. Shows on the dashboard calendar (e.g. assignment due date).
        </p>
        <Input
          type='datetime-local'
          value={deadlineAtLocal}
          onChange={(e) => setDeadlineAtLocal(e.target.value)}
          className={dialogInputClass}
          aria-label='Calendar deadline'
        />
      </fieldset>
    </div>
  );
}
