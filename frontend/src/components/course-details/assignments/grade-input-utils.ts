/** Reject grade input that exceeds max marks or is otherwise invalid. */
export function isGradeInputAllowed(raw: string, cap: number): boolean {
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === '-' || trimmed === '.') return true;
  const n = Number(trimmed);
  if (Number.isNaN(n)) return false;
  return n >= 0 && n <= cap;
}
