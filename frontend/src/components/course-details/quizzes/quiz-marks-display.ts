/** User-facing quiz result copy — prefer marks (points earned) over "score". */

/** Rounds to 1 decimal instead of a whole number — teachers can award
 * half-point marks (see the grader's 0.5 step), and whole-number rounding
 * here previously turned e.g. 0.5/4 into a displayed "1/4". Use this
 * anywhere a marks value is shown, not just where it's derived from percent. */
export function roundToHalfMark(n: number): number {
  return Math.round(n * 10) / 10;
}

export function earnedMarksFromPercent(scorePct: number, totalMarks: number): number {
  if (totalMarks <= 0) return 0;
  return roundToHalfMark((scorePct / 100) * totalMarks);
}

function trimTrailingZero(n: number): string {
  return roundToHalfMark(n) === Math.round(n) ? String(Math.round(n)) : n.toFixed(1);
}

export function formatMarksFraction(earned: number, total: number): string {
  return `${trimTrailingZero(earned)}/${trimTrailingZero(total)} marks`;
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
