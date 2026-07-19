export function matchesSearch(entry, search) {
  if (!search) return true;
  const q = search.toLowerCase();
  const haystack = [
    entry.action,
    entry.actionLabel,
    entry.actorName,
    entry.actorEmail,
    entry.targetLabel,
    entry.summary,
    entry.description,
    entry.module,
    entry.sourceLabel,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function matchesExtendedFilters(entry, filters) {
  if (filters.module && filters.module !== 'all' && entry.module !== filters.module) return false;
  if (filters.actionType && filters.actionType !== 'all' && entry.actionType !== filters.actionType)
    return false;
  if (filters.severity && filters.severity !== 'all' && entry.severity !== filters.severity)
    return false;
  if (filters.status && filters.status !== 'all' && entry.status !== filters.status) return false;
  return true;
}
