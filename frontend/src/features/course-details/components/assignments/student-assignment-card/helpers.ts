export function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / 1024).toFixed(1)} KB`;
}

export function dueSoonLabel(msUntilDue: number): string | null {
  if (msUntilDue <= 0) return null;
  const hours = Math.floor(msUntilDue / (60 * 60 * 1000));
  if (hours < 1) return `in ${Math.max(1, Math.floor(msUntilDue / 60_000))}m`;
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.floor(hours / 24)}d`;
}

export function statusAccentClass(opts: {
  isGraded: boolean;
  passed: boolean;
  hasSubmitted: boolean;
  closed: boolean;
  dueSoon: boolean;
}) {
  if (opts.isGraded) return opts.passed ? 'border-l-emerald-500' : 'border-l-rose-500';
  if (opts.hasSubmitted) return 'border-l-emerald-500';
  if (opts.closed) return 'border-l-rose-500';
  if (opts.dueSoon) return 'border-l-amber-500';
  return 'border-l-indigo-500';
}
