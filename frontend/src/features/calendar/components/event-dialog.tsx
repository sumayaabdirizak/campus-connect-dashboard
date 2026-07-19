'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  useCreatePersonalEvent,
  useUpdatePersonalEvent,
  useDeletePersonalEvent,
  type PersonalEvent,
} from '../api';
import { PERSONAL_DEFAULT_COLOR } from '../types';
import { combineToIso, isoToDateInput, isoToTimeInput } from './event-datetime-utils';
import { EventDialogFields } from './event-dialog-fields';

export function EventDialog({
  open,
  onOpenChange,
  event,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: PersonalEvent | null;
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
      allDay,
    };

    if (isEdit && event) {
      updateMut.mutate(
        { id: event.id, body },
        {
          onSuccess: () => {
            toast.success('Event updated');
            onOpenChange(false);
          },
          onError: (e) => toast.error(e.message || 'Could not update event'),
        }
      );
    } else {
      createMut.mutate(body, {
        onSuccess: () => {
          toast.success('Event added');
          onOpenChange(false);
        },
        onError: (e) => toast.error(e.message || 'Could not add event'),
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
      onError: (e) => toast.error(e.message || 'Could not delete event'),
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

        <EventDialogFields
          title={title}
          onTitleChange={setTitle}
          allDay={allDay}
          onAllDayChange={setAllDay}
          date={date}
          onDateChange={setDate}
          startTime={startTime}
          onStartTimeChange={setStartTime}
          endTime={endTime}
          onEndTimeChange={setEndTime}
          color={color}
          onColorChange={setColor}
          notes={notes}
          onNotesChange={setNotes}
        />

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
