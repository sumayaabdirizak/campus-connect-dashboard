import type { Gradebook } from '@/lib/course-details/services/gradebook-types';
import {
  assignmentCell,
  fmtPoints,
  fmtScoreFromPct,
  quizCell
} from './gradebook-math';

export function exportGradebookCsv(gb: Gradebook, students?: Gradebook['students']) {
  const rows = students ?? gb.students;
  const courseMax = gb.courseMaxMarks;
  const header = [
    'Student',
    'Email',
    'ID',
    ...gb.columns.assignments.map((a) => `${a.title} (/${a.maxMarks})`),
    ...gb.columns.quizzes.map((q) => `${q.title} (/${q.maxMarks})`),
    `Overall (/${courseMax})`
  ];
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.map(escape).join(',')];
  for (const row of rows) {
    const cells: (string | number)[] = [row.name, row.email, row.number ?? ''];
    for (const a of gb.columns.assignments) {
      const cell = assignmentCell(row, a.id);
      cells.push(
        cell?.grade != null
          ? fmtPoints(Math.min(cell.grade, a.maxMarks), a.maxMarks)
          : ''
      );
    }
    for (const q of gb.columns.quizzes) {
      const cell = quizCell(row, q.id);
      if (cell?.pct == null || q.maxMarks <= 0) {
        cells.push('');
      } else {
        const earned =
          cell.earned != null ? cell.earned : (cell.pct / 100) * q.maxMarks;
        cells.push(fmtPoints(earned, q.maxMarks));
      }
    }
    cells.push(
      row.overallEarned != null
        ? fmtPoints(row.overallEarned, courseMax)
        : ''
    );
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
