import { MONTHS, PERIOD_OPTIONS } from './constants.js';

export function parsePeriodMonths(raw) {
  const text = String(raw ?? '6m').trim().toLowerCase();
  const match = text.match(/^(\d+)\s*m$/);
  const n = match ? Number(match[1]) : 6;
  return PERIOD_OPTIONS.has(n) ? n : 6;
}

export function monthSeries(count) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1) + i, 1);
    return { label: MONTHS[d.getMonth()], key: `${d.getFullYear()}-${d.getMonth()}` };
  });
}

export function toMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export function periodStart(months) {
  const d = new Date();
  d.setMonth(d.getMonth() - (months - 1));
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}
