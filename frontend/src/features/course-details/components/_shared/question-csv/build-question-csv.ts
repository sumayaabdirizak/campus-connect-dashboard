import { escapeCsvCell } from './csv-tokenizer';
import type { ParsedQuestionRow } from './types';

export function buildQuestionCsv(rows: ParsedQuestionRow[], mode: 'bank' | 'quiz'): string {
  const maxOptions = Math.min(
    6,
    Math.max(2, ...rows.map((r) => r.options.length))
  );

  const headerCells: string[] = [
    'question_text',
    'type',
    'points',
    'topic',
    'difficulty'
  ];
  if (mode === 'quiz') headerCells.push('explanation');
  for (let n = 1; n <= maxOptions; n++) {
    headerCells.push(`option_${n}`);
    headerCells.push(`option_${n}_correct`);
  }

  const lines: string[] = [headerCells.join(',')];

  for (const r of rows) {
    const cells: string[] = [
      r.question_text,
      r.question_type,
      String(r.points),
      r.topic ?? '',
      r.difficulty ?? ''
    ];
    if (mode === 'quiz') cells.push(r.explanation ?? '');
    for (let n = 0; n < maxOptions; n++) {
      const opt = r.options[n];
      cells.push(opt ? opt.option_text : '');
      cells.push(opt ? (opt.is_correct ? 'true' : 'false') : '');
    }
    lines.push(cells.map(escapeCsvCell).join(','));
  }

  return lines.join('\n') + '\n';
}
