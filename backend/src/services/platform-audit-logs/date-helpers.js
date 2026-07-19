export function parseDate(raw) {
  if (raw == null || raw === '') return null;
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfYesterday() {
  const d = startOfToday();
  d.setDate(d.getDate() - 1);
  return d;
}

export function buildDateWhere(dateFrom, dateTo, field = 'createdAt') {
  if (!dateFrom && !dateTo) return {};
  const range = {};
  if (dateFrom) range.gte = dateFrom;
  if (dateTo) range.lte = dateTo;
  return { [field]: range };
}
