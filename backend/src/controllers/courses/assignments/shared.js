export const attachmentInclude = {
  attachments: {
    orderBy: { created_at: 'asc' },
    include: { uploadedBy: { select: { id: true, full_name: true } } },
  },
};

export function normaliseModes({ workMode, gradingScope }) {
  const valid = (v) => v === 'INDIVIDUAL' || v === 'GROUP';
  const wm = valid(workMode) ? workMode : null;
  const gs = valid(gradingScope) ? gradingScope : null;
  if (wm === 'INDIVIDUAL' && gs === 'GROUP') {
    return { error: 'workMode=INDIVIDUAL is incompatible with gradingScope=GROUP' };
  }
  return { data: { ...(wm && { workMode: wm }), ...(gs && { gradingScope: gs }) } };
}

export function normaliseMaxMarks(maxMarks) {
  if (maxMarks === undefined || maxMarks === null) return { data: {} };
  if (!Number.isInteger(maxMarks) || maxMarks < 1 || maxMarks > 100) {
    return { error: 'maxMarks must be an integer between 1 and 100' };
  }
  return { data: { maxMarks } };
}

/** Coerce late window to int minutes; omit when undefined/null. */
export function normaliseLateWindow(lateWindowMinutes) {
  if (lateWindowMinutes === undefined || lateWindowMinutes === null) {
    return { data: {} };
  }
  const n = Number(lateWindowMinutes);
  if (!Number.isFinite(n)) {
    return { error: 'lateWindowMinutes must be a number' };
  }
  const minutes = Math.trunc(n);
  if (minutes < 0 || minutes > 10080) {
    return { error: 'lateWindowMinutes must be between 0 and 10080' };
  }
  return { data: { lateWindowMinutes: minutes } };
}
