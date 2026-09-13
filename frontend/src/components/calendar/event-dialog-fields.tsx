'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { EVENT_COLOR_PRESETS } from './event-datetime-utils';

export function EventDialogFields({
  title,
  onTitleChange,
  allDay,
  onAllDayChange,
  date,
  onDateChange,
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
  color,
  onColorChange,
  notes,
  onNotesChange,
}: {
  title: string;
  onTitleChange: (v: string) => void;
  allDay: boolean;
  onAllDayChange: (v: boolean) => void;
  date: string;
  onDateChange: (v: string) => void;
  startTime: string;
  onStartTimeChange: (v: string) => void;
  endTime: string;
  onEndTimeChange: (v: string) => void;
  color: string;
  onColorChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
}) {
  return (
    <div className='space-y-4 py-1'>
      <div className='space-y-1.5'>
        <Label htmlFor='evt-title'>Title</Label>
        <Input
          id='evt-title'
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder='e.g. Study group, Dentist…'
          autoFocus
        />
      </div>

      <div className='flex items-center justify-between rounded-lg border px-3 py-2'>
        <Label htmlFor='evt-allday' className='cursor-pointer'>
          All day
        </Label>
        <Switch id='evt-allday' checked={allDay} onCheckedChange={onAllDayChange} />
      </div>

      <div className='space-y-3'>
        <div className='space-y-1.5'>
          <Label htmlFor='evt-date'>Date</Label>
          <Input id='evt-date' type='date' value={date} onChange={(e) => onDateChange(e.target.value)} className='w-full' />
        </div>
        {!allDay && (
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-1.5'>
              <Label htmlFor='evt-start'>Start</Label>
              <Input id='evt-start' type='time' value={startTime} onChange={(e) => onStartTimeChange(e.target.value)} className='w-full' />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='evt-end'>End</Label>
              <Input id='evt-end' type='time' value={endTime} onChange={(e) => onEndTimeChange(e.target.value)} className='w-full' />
            </div>
          </div>
        )}
      </div>

      <div className='space-y-1.5'>
        <Label>Color</Label>
        <div className='flex flex-wrap gap-2'>
          {EVENT_COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type='button'
              aria-label={`Color ${c}`}
              onClick={() => onColorChange(c)}
              className={cn(
                'h-7 w-7 rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110',
                color === c && 'ring-2 ring-ring'
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div className='space-y-1.5'>
        <Label htmlFor='evt-notes'>Notes</Label>
        <Textarea
          id='evt-notes'
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder='Optional details…'
          className='min-h-[64px] resize-none'
        />
      </div>
    </div>
  );
}
