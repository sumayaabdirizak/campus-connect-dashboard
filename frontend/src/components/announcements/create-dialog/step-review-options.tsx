'use client';

import { Input } from '@/features/ui/components/input';
import { Label } from '@/features/ui/components/label';
import { Checkbox } from '@/features/ui/components/checkbox';
import { Icons } from '@/components/icons';
import type { AnnouncementPriority } from '@/lib/announcements/types';
import type { ActiveDaysPreset } from './types';
import { segmentedClass } from './utils';

type Props = {
  priority: AnnouncementPriority;
  setPriority: (v: AnnouncementPriority) => void;
  activeDaysPreset: ActiveDaysPreset;
  setActiveDaysPreset: (v: ActiveDaysPreset) => void;
  expiresAtCustom: string;
  setExpiresAtCustom: (v: string) => void;
  deadlineAtLocal: string;
  setDeadlineAtLocal: (v: string) => void;
  isEditMode: boolean;
  notifySms: boolean;
  setNotifySms: (v: boolean) => void;
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
  isEditMode,
  notifySms,
  setNotifySms,
}: Props) {
  return (
    <>
      <fieldset className='space-y-2'>
        <legend className='text-xs font-medium text-foreground'>Priority</legend>
        <div
          role='radiogroup'
          aria-label='Priority'
          className='flex gap-1 rounded-xl border border-input bg-muted/50 p-1'
        >
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

      <fieldset className='space-y-2'>
        <legend className='text-xs font-medium text-foreground'>Active days</legend>
        <p className='text-[11px] text-muted-foreground'>
          Active posts sort to the top for the selected number of days, then return to normal order
          (they stay visible as regular announcements). Day presets count from when you post. Custom
          end overrides presets.
        </p>
        <div className='flex flex-wrap gap-1 rounded-xl border border-input bg-muted/50 p-1'>
          {(
            [
              { value: 'off' as const, label: 'No limit' },
              { value: '1' as const, label: '1 day' },
              { value: '3' as const, label: '3 days' },
              { value: '5' as const, label: '5 days' },
              { value: '7' as const, label: '7 days' },
            ] as const
          ).map((opt) => {
            const active = activeDaysPreset === opt.value;
            return (
              <button
                key={opt.value}
                type='button'
                onClick={() => {
                  setActiveDaysPreset(opt.value);
                  if (opt.value !== 'off') setExpiresAtCustom('');
                }}
                className={segmentedClass(active)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='expires-custom' className='text-[11px] text-muted-foreground'>
            Or custom end (overrides preset)
          </Label>
          <Input
            id='expires-custom'
            type='datetime-local'
            value={expiresAtCustom}
            onChange={(e) => {
              setExpiresAtCustom(e.target.value);
              if (e.target.value) setActiveDaysPreset('off');
            }}
            className='rounded-lg'
          />
        </div>
      </fieldset>

      <fieldset className='space-y-2'>
        <legend className='text-xs font-medium text-foreground'>Calendar deadline</legend>
        <p className='text-[11px] text-muted-foreground'>
          Optional. Appears on the dashboard calendar for recipients (e.g. exam submission due).
        </p>
        <Input
          type='datetime-local'
          value={deadlineAtLocal}
          onChange={(e) => setDeadlineAtLocal(e.target.value)}
          className='rounded-lg'
          aria-label='Calendar deadline'
        />
      </fieldset>

      {!isEditMode ? (
        <fieldset className='space-y-2'>
          <legend className='text-xs font-medium text-foreground'>SMS</legend>
          <label className='flex cursor-pointer items-start gap-3 rounded-xl border border-input bg-muted/30 px-4 py-3 text-sm'>
            <Checkbox
              checked={notifySms}
              onCheckedChange={(v) => setNotifySms(v === true)}
              className='mt-0.5'
              aria-label='Send SMS notification'
            />
            <span>
              Send SMS alert to recipients who have a phone on file
              <span className='mt-1 block text-[11px] font-normal text-muted-foreground'>
                Uses Twilio when TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER are
                set; otherwise the server logs a demo line only.
              </span>
            </span>
          </label>
        </fieldset>
      ) : null}
    </>
  );
}
