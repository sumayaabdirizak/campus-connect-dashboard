export const EVENT_COLOR_PRESETS = [
  '#0468CE',
  '#0C8806',
  '#F59E0B',
  '#EC4899',
  '#7C3AED',
  '#14B8A6',
  '#EF4444',
  '#64748B',
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function isoToDateInput(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isoToTimeInput(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function combineToIso(dateStr: string, timeStr: string, allDay: boolean): string | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (allDay) return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
  const [hh, mm] = (timeStr || '09:00').split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
}
