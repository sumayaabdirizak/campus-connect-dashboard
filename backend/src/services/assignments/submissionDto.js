/** Map Submission (+ optional gradeRow) to legacy client fields. */
export function toSubmissionClient(row) {
  if (!row) return row;
  const score = row.gradeRow?.score ?? null;
  const feedback = row.gradeRow?.feedback ?? null;
  const isReviewed = row.gradeRow != null;
  const isLate = row.lateState === 'LATE';
  return {
    ...row,
    grade: score,
    feedback,
    is_reviewed: isReviewed,
    is_late: isLate,
    lateState: row.lateState ?? 'ON_TIME',
  };
}
