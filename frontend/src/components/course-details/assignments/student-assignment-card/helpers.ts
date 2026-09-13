export function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / 1024).toFixed(1)} KB`;
}

export function fileKindFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'PDF';
  if (lower.endsWith('.docx') || lower.endsWith('.doc')) return 'Word';
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'Excel';
  if (lower.endsWith('.pptx') || lower.endsWith('.ppt')) return 'PowerPoint';
  if (lower.endsWith('.zip') || lower.endsWith('.rar')) return 'ZIP';
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'Image';
  const ext = lower.split('.').pop();
  return ext ? ext.toUpperCase() : 'File';
}

function humanizeUploadFilename(rawName: string): string {
  const stripped = rawName.replace(/^\d+-/, '') || rawName;
  const dot = stripped.lastIndexOf('.');
  const base = dot > 0 ? stripped.slice(0, dot) : stripped;
  const ext = dot > 0 ? stripped.slice(dot + 1) : '';
  if (!base || /^\d+$/.test(base) || base.length < 3) {
    return ext ? `Submitted file.${ext}` : 'Submitted file';
  }
  return stripped;
}

export type ParsedSubmissionContent =
  | { type: 'file'; label: string; kind: string; href: string }
  | { type: 'link'; label: string; kind: string; href: string; subtitle: string };

export function parseSubmissionContent(contentUrl: string): ParsedSubmissionContent {
  try {
    const url = new URL(contentUrl);
    const isUpload = /\/uploads\/submissions\//.test(url.pathname);
    const rawName = decodeURIComponent(
      url.pathname.split('/').filter(Boolean).pop() ?? 'Submission'
    );

    if (isUpload) {
      const label = humanizeUploadFilename(rawName);
      return {
        type: 'file',
        label,
        kind: fileKindFromName(label),
        href: contentUrl,
      };
    }

    const host = url.hostname.replace(/^www\./, '');
    return {
      type: 'link',
      label: host,
      kind: 'Link',
      href: contentUrl,
      subtitle: contentUrl.length > 72 ? `${contentUrl.slice(0, 69)}…` : contentUrl,
    };
  } catch {
    return { type: 'link', label: 'Submission link', kind: 'Link', href: contentUrl, subtitle: contentUrl };
  }
}

export function dueSoonLabel(msUntilDue: number): string | null {
  if (msUntilDue <= 0) return null;
  const hours = Math.floor(msUntilDue / (60 * 60 * 1000));
  if (hours < 1) return `in ${Math.max(1, Math.floor(msUntilDue / 60_000))}m`;
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.floor(hours / 24)}d`;
}

/** How late a submission was relative to the (effective) due date. */
export function formatLateBy(
  submittedAt: Date | string,
  dueAt: Date | string
): string | null {
  const submitted = new Date(submittedAt).getTime();
  const due = new Date(dueAt).getTime();
  if (!Number.isFinite(submitted) || !Number.isFinite(due)) return null;
  const ms = submitted - due;
  if (ms <= 0) return null;
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'less than 1 min late';
  if (mins < 60) return `${mins} min late`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 48) {
    return remMins > 0 ? `${hours}h ${remMins}m late` : `${hours}h late`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h late` : `${days}d late`;
}



