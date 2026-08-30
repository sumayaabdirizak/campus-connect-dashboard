import { toast } from 'sonner';
import { serverNow, serverNowDate } from '@/lib/server-clock';

/** Value for `<input type="datetime-local" min={...} />` in local time. */
export function toDatetimeLocalMin(from = serverNowDate()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}T${pad(from.getHours())}:${pad(from.getMinutes())}`;
}

export function isPastExtensionDate(value: string): boolean {
  if (!value.trim()) return false;
  const picked = new Date(value);
  return Number.isNaN(picked.getTime()) || picked.getTime() < serverNow();
}

/** Rejects past picks: clears the field and shows a toast (auto-cancel). */
export function handleExtensionDateChange(value: string, setDate: (v: string) => void) {
  if (!value) {
    setDate('');
    return;
  }
  if (isPastExtensionDate(value)) {
    toast.error('Pick a future date and time');
    setDate('');
    return;
  }
  setDate(value);
}

export function validateExtensionDate(value: string): boolean {
  if (!value.trim()) {
    toast.error('Pick a new due date');
    return false;
  }
  if (isPastExtensionDate(value)) {
    toast.error('Pick a future date and time');
    return false;
  }
  return true;
}
