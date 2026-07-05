'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useCreatePersonalEvent,
  useUpdatePersonalEvent,
  useDeletePersonalEvent,
  type PersonalEvent
} from '../api';
import { PERSONAL_DEFAULT_COLOR } from '../types';

const COLOR_PRESETS = [
  '#0468CE',
  '#0C8806',
  '#F59E0B',
  '#EC4899',
  '#7C3AED',
  '#14B8A6',
  '#EF4444',
  '#64748B'
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function isoToDateInput(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function isoToTimeInput(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function combineToIso(dateStr: string, timeStr: string, allDay: boolean): string | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (allDay) return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
  const [hh, mm] = (timeStr || '09:00').split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
}

export function EventDialog({
  open,
  onOpenChange,
  event,
  defaultDate
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this event; otherwise it creates a new one. */
  event?: PersonalEvent | null;
  /** Pre-fills the date when creating from a clicked day. */
  defaultDate?: Date;
}) {
  const isEdit = !!event;
  const createMut = useCreatePersonalEvent();
  const updateMut = useUpdatePersonalEvent();
  const deleteMut = useDeletePersonalEvent();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState(PERSONAL_DEFAULT_COLOR);
  const [allDay, setAllDay] = useState(false);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  // Re-seed form state whenever the dialog opens (for either edit or create).
  useEffect(() => {
    if (!open) return;
    if (event) {
      setTitle(event.title);
      setNotes(event.notes ?? '');
      setColor(event.color ?? PERSONAL_DEFAULT_COLOR);
      setAllDay(event.allDay);
      setDate(isoToDateInput(event.startsAt));
      setStartTime(isoToTimeInput(event.startsAt));
      setEndTime(event.endsAt ? isoToTimeInput(event.endsAt) : '10:00');
    } else {
      const base = defaultDate ?? new Date();
      setTitle('');
      setNotes('');
      setColor(PERSONAL_DEFAULT_COLOR);
      setAllDay(false);
      setDate(isoToDateInput(base.toISOString()));
      setStartTime('09:00');
      setEndTime('10:00');
    }
  }, [open, event, defaultDate]);

  const busy = createMut.isPending || updateMut.isPending || deleteMut.isPending;

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error('Give your event a title');
      return;
    }
    const startsAt = combineToIso(date, startTime, allDay);
    if (!startsAt) {
      toast.error('Pick a date');
      return;
    }
    const endsAt = allDay ? null : combineToIso(date, endTime, false);
    const body = {
      title: trimmed,
      notes: notes.trim() || null,
      color,
      startsAt,
      endsAt: endsAt && endsAt > startsAt ? endsAt : null,
      allDay
    };

    if (isEdit && event) {
      updateMut.mutate(
        { id: event.id, body },
        {
          onSuccess: () => {
            toast.success('Event updated');
            onOpenChange(false);
          },
          onError: (e) => toast.error(e.message || 'Could not update event')
        }
      );
    } else {
      createMut.mutate(body, {
        onSuccess: () => {
          toast.success('Event added');
          onOpenChange(false);
        },
        onError: (e) => toast.error(e.message || 'Could not add event')
      });
    }
  };

  const handleDelete = () => {
    if (!event) return;
    deleteMut.mutate(event.id, {
      onSuccess: () => {
        toast.success('Event deleted');
        onOpenChange(false);
      },
      onError: (e) => toast.error(e.message || 'Could not delete event')
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit event' : 'New event'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update your personal calendar event.'
              : 'Add a personal event or reminder to your calendar.'}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-1'>
          <div className='space-y-1.5'>
            <Label htmlFor='evt-title'>Title</Label>
            <Input
              id='evt-title'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='e.g. Study group, Dentist…'
              autoFocus
            />
          </div>

          <div className='flex items-center justify-between rounded-lg border px-3 py-2'>
            <Label htmlFor='evt-allday' className='cursor-pointer'>
              All day
            </Label>
            <Switch id='evt-allday' checked={allDay} onCheckedChange={setAllDay} />
          </div>

          <div className='space-y-3'>
            <div className='space-y-1.5'>
              <Label htmlFor='evt-date'>Date</Label>
              <Input
                id='evt-date'
                type='date'
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className='w-full'
              />
            </div>
            {!allDay && (
              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-1.5'>
                  <Label htmlFor='evt-start'>Start</Label>
                  <Input
                    id='evt-start'
                    type='time'
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className='w-full'
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='evt-end'>End</Label>
                  <Input
                    id='evt-end'
                    type='time'
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className='w-full'
                  />
                </div>
              </div>
            )}
          </div>

          <div className='space-y-1.5'>
            <Label>Color</Label>
            <div className='flex flex-wrap gap-2'>
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type='button'
                  aria-label={`Color ${c}`}
                  onClick={() => setColor(c)}
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
              onChange={(e) => setNotes(e.target.value)}
              placeholder='Optional details…'
              className='min-h-[64px] resize-none'
            />
          </div>
        </div>

        <DialogFooter className='flex-row items-center justify-between sm:justify-between'>
          {isEdit ? (
            <Button
              type='button'
              variant='ghost'
              className='text-destructive hover:text-destructive'
              onClick={handleDelete}
              disabled={busy}
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className='flex items-center gap-2'>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type='button' onClick={handleSubmit} disabled={busy}>
              {isEdit ? 'Save' : 'Add event'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
