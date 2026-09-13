/**
 * "1 assignments" reads as a bug to anyone looking at a report. Labels arrive
 * from the API already plural, so singularise them when the count is one.
 * Handles the -zes/-es cases (quizzes → quiz) rather than just dropping an s.
 */
export function countLabel(label: string, value: number) {
  const l = label.toLowerCase();
  if (value !== 1) return l;
  if (l.endsWith('zzes')) return l.slice(0, -3);
  // consonant + -ies came from a -y singular: replies → reply, faculties →
  // faculty. Without this the generic -s rule produced "1 replie".
  if (/[^aeiou]ies$/.test(l)) return `${l.slice(0, -3)}y`;
  if (/(ses|xes|ches|shes)$/.test(l)) return l.slice(0, -2);
  if (l.endsWith('s') && !l.endsWith('ss')) return l.slice(0, -1);
  return l;
}
