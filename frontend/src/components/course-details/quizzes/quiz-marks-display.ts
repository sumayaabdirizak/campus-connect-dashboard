/** User-facing quiz result copy — prefer marks (points earned) over "score". */

export function earnedMarksFromPercent(scorePct: number, totalMarks: number): number {
  if (totalMarks <= 0) return 0;
  return Math.round((scorePct / 100) * totalMarks);
}

export function formatMarksFraction(earned: number, total: number): string {
  return `${Math.round(earned)}/${Math.round(total)} marks`;
}

export function formatMarksWithPercent(
  earned: number,
  total: number,
  scorePct?: number | null
): string {
  const fraction = formatMarksFraction(earned, total);
  if (scorePct == null || total <= 0) return fraction;
  return `${fraction} (${Math.round(scorePct)}%)`;
}

export function formatYourMarksLabel(
  earned: number,
  total: number,
  scorePct?: number | null
): string {
  return `Your marks: ${formatMarksWithPercent(earned, total, scorePct)}`;
}

export function quizTotalMarks(
  questions: Array<{ points: number }> | undefined | null
): number {
  return (questions ?? []).reduce((sum, q) => sum + (Number(q.points) || 0), 0);
}
