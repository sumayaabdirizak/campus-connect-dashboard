import type { Gradebook } from '@/lib/course-details/services/gradebook-types';
import {
  assignmentCell,
  computeOverallPoints,
  fmtPoints,
  quizCell
} from './gradebook-math';

export function exportGradebookCsv(gb: Gradebook) {
  const header = [
    'Student',
    'Email',
    'ID',
    ...gb.columns.assignments.map((a) => `${a.title} (/${a.maxMarks})`),
    ...gb.columns.quizzes.map((q) => `${q.title} (%)`),
    'Overall %',
    'Overall (points)'
  ];
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.map(escape).join(',')];
  for (const row of gb.students) {
    const cells: (string | number)[] = [row.name, row.email, row.number ?? ''];
    for (const a of gb.columns.assignments) {
      const cell = assignmentCell(row, a.id);
      cells.push(cell?.grade != null ? cell.grade : '');
    }
    for (const q of gb.columns.quizzes) {
      const cell = quizCell(row, q.id);
      cells.push(cell?.pct != null ? Math.round(cell.pct) : '');
    }
    cells.push(row.overallPct != null ? Math.round(row.overallPct) : '');
    const points = computeOverallPoints(row, gb.columns);
    cells.push(points ? fmtPoints(points.earned, points.max) : '');
    lines.push(cells.map(escape).join(','));
  }
  const blob = new Blob(['﻿' + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `gradebook-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
