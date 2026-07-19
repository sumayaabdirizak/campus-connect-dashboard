import { format } from 'date-fns';
import { toast } from 'sonner';
import { buildApiUrl } from '@/lib/api-config';
import type { CalendarItem } from '../types';
import { KIND_LABEL } from '../types';

export async function downloadCalendarIcs(fromIso: string, toIso: string) {
  const from = encodeURIComponent(fromIso);
  const to = encodeURIComponent(toIso);
  const res = await fetch(
    buildApiUrl(`/announcements/calendar-deadlines.ics?from=${from}&to=${to}`),
    { credentials: 'include' }
  );
  if (!res.ok)
    throw new Error((await res.text().catch(() => '')) || `Export failed (${res.status})`);
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = 'campus-deadlines.ics';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
  toast.success('Calendar file downloaded');
}

export function downloadCalendarCsv(items: CalendarItem[], rangeStart: Date) {
  const rows = [...items].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  );
  if (rows.length === 0) {
    toast.error('Nothing to export in this range');
    return;
  }
  const esc = (v: string | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['Date', 'Time', 'Title', 'Course', 'Type'];
  const lines = [header.map(esc).join(',')];
  for (const it of rows) {
    const d = new Date(it.startsAt);
    lines.push(
      [
        format(d, 'yyyy-MM-dd'),
        it.allDay ? 'All day' : format(d, 'HH:mm'),
        it.title,
        it.courseCode ?? '',
        KIND_LABEL[it.kind]
      ]
        .map(esc)
        .join(',')
    );
  }
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;'
  });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = `campus-deadlines-${format(rangeStart, 'yyyy-MM-dd')}.csv`;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
  toast.success('Deadline table exported');
}
