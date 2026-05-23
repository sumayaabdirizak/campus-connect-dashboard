import type { QuizQuestionType } from '../../api/quizzes-types';

// ─────────────────────────────────────────────────────────────────────────────
// Shared CSV parsing + serialization for question-shaped rows.
//
// Used by:
//   - Question Bank Manager — bulk import into the bank (no `explanation`)
//   - Quiz Builder — round-trip a single quiz (with `explanation`)
//
// The format is forgiving on input (column order doesn't matter, optional
// columns are tolerated) and strict on output (canonical column order so
// re-importing what we exported never confuses the parser). The serializer
// is RFC-4180-ish — quotes any field containing a comma, newline, or quote,
// and doubles internal quotes. The parser handles the same shape plus the
// common Excel/Sheets export conventions.
// ─────────────────────────────────────────────────────────────────────────────

/// Generic question row, shared between bank and quiz imports. The `kind`
/// generic narrows whether `explanation` is permitted:
///   - 'bank' — no explanation field (the bank `Question` model doesn't carry it)
///   - 'quiz' — includes explanation
/// We keep both in the same util because the underlying shape is otherwise
/// identical and the divergence is a single optional column.
export interface ParsedQuestionRow {
  question_text: string;
  question_type: QuizQuestionType;
  points: number;
  topic: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  /// Only populated when the parser is run in 'quiz' mode and the column is
  /// present. The bank consumer just ignores it.
  explanation: string | null;
  /// Options array — empty for SHORT_ANSWER. Each option is shaped so the
  /// caller can drop it straight into a Prisma create or an apiClient body.
  options: Array<{ option_text: string; is_correct: boolean; order_index: number }>;
}

export interface ParseResult {
  rows: ParsedQuestionRow[];
  errors: Array<{ rowIndex: number; reason: string }>;
}

/// Parse a CSV string into validated question rows. Skips empty lines.
/// Rows with missing required fields or bad option counts are collected in
/// `errors` rather than throwing, so the caller can render "N valid · M
/// skipped (e.g. row 5: no correct option marked)" instead of bailing on
/// the whole file.
///
/// @param text   Raw CSV body. Empty / whitespace-only returns no rows + no errors.
/// @param mode   'bank' or 'quiz'. Quiz mode reads the optional explanation column.
export function parseQuestionCsv(text: string, mode: 'bank' | 'quiz'): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { rows: [], errors: [] };
  const rows = parseCsvRows(trimmed);
  if (rows.length < 2) return { rows: [], errors: [] };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const indexOf = (name: string) => header.indexOf(name);

  const colText = indexOf('question_text');
  const colType = indexOf('type');
  const colPoints = indexOf('points');
  const colTopic = indexOf('topic');
  const colDifficulty = indexOf('difficulty');
  // Only read explanation in quiz mode — bank imports drop it on the floor
  // even if it's in the file, to avoid surprising the user about which
  // fields persist on which model.
  const colExplanation = mode === 'quiz' ? indexOf('explanation') : -1;

  const parsedRows: ParsedQuestionRow[] = [];
  const errors: ParseResult['errors'] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every((c) => c.trim() === '')) continue; // skip blank lines

    const qText = colText >= 0 ? (row[colText] ?? '').trim() : '';
    if (!qText) {
      errors.push({ rowIndex: i - 1, reason: 'missing question_text' });
      continue;
    }
    const rawType = (colType >= 0 ? row[colType] : 'MCQ').trim().toUpperCase();
    const type: QuizQuestionType =
      rawType === 'TRUE_FALSE' || rawType === 'SHORT_ANSWER'
        ? (rawType as QuizQuestionType)
        : 'MCQ';
    const points =
      colPoints >= 0 ? Number(row[colPoints]) || 1 : 1;
    const topic =
      colTopic >= 0 ? (row[colTopic] ?? '').trim() || null : null;
    const diffRaw =
      colDifficulty >= 0
        ? (row[colDifficulty] ?? '').trim().toLowerCase()
        : '';
    const difficulty =
      diffRaw === 'easy' || diffRaw === 'medium' || diffRaw === 'hard'
        ? (diffRaw as 'easy' | 'medium' | 'hard')
        : null;
    const explanation =
      colExplanation >= 0 ? (row[colExplanation] ?? '').trim() || null : null;

    let options: ParsedQuestionRow['options'] = [];
    if (type !== 'SHORT_ANSWER') {
      // Walk option_1, option_2, … up to option_6. We allow non-contiguous
      // numbering (option_2 filled but option_1 blank) — useful when a
      // teacher edits in Excel and deletes a wrong-looking distractor.
      for (let n = 1; n <= 6; n++) {
        const txtIdx = indexOf(`option_${n}`);
        const flagIdx = indexOf(`option_${n}_correct`);
        if (txtIdx < 0) break;
        const text = (row[txtIdx] ?? '').trim();
        if (!text) continue;
        const flag = (row[flagIdx] ?? '').trim().toLowerCase();
        const isCorrect =
          flag === 'true' || flag === '1' || flag === 'yes' || flag === 'y';
        options.push({
          option_text: text,
          is_correct: isCorrect,
          order_index: options.length
        });
      }
      // Synthesize the canonical True/False shape if the row didn't ship
      // any options. The teacher then has to mark which is correct in the
      // builder — but at least the row imports.
      if (type === 'TRUE_FALSE' && options.length === 0) {
        options = [
          { option_text: 'True', is_correct: false, order_index: 0 },
          { option_text: 'False', is_correct: false, order_index: 1 }
        ];
      }
      if (options.length < 2) {
        errors.push({ rowIndex: i - 1, reason: 'need at least 2 options' });
        continue;
      }
      if (!options.some((o) => o.is_correct)) {
        errors.push({ rowIndex: i - 1, reason: 'no correct option marked' });
        continue;
      }
    }

    parsedRows.push({
      question_text: qText,
      question_type: type,
      points,
      topic,
      difficulty,
      explanation,
      options
    });
  }

  return { rows: parsedRows, errors };
}

/// Build a CSV string from question rows (the inverse of parseQuestionCsv).
/// Used by the quiz "Export CSV" action so the round-trip is symmetric: a
/// teacher can download, edit in Excel, and re-upload without column-name
/// surgery. Always emits the full canonical header so column order is
/// deterministic across exports (helps diff tools / version control).
///
/// @param rows  Questions to serialize. Each option is positional —
///              option_1 = options[0], option_2 = options[1], etc.
/// @param mode  'bank' or 'quiz'. Quiz mode emits the explanation column.
export function buildQuestionCsv(
  rows: ParsedQuestionRow[],
  mode: 'bank' | 'quiz'
): string {
  // Find the max option count any row uses so the header carries enough
  // columns. Capped at 6 because that's what the parser walks; rows with
  // more would be truncated on re-import anyway.
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

  // Trailing newline — Excel and `csv-parser` both expect it. The parser
  // tolerates its absence; we emit it for consistency with other tools.
  return lines.join('\n') + '\n';
}

/// Trigger a browser file download for a CSV string. Wraps the
/// Blob+ObjectURL+anchor dance into one call so the components don't have to
/// reinvent it. SSR-safe — bails silently if `window` isn't defined.
export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === 'undefined') return;
  // BOM = `﻿`. Excel needs this to read UTF-8 CSVs as Unicode rather
  // than the legacy ANSI codepage; without it, names with accents come back
  // mangled. Other parsers (Google Sheets, pandas) tolerate the BOM fine.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Microtask-defer revoke so Safari has the URL in hand by the time it
  // initiates the download. Calling revoke immediately occasionally loses
  // the download on slower devices.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// ─── CSV row tokenizer ──────────────────────────────────────────────────────
//
// State-machine parser that handles quoted fields with embedded commas /
// newlines / escaped quotes (""). Not a full RFC-4180 implementation —
// Excel exports work, Google Sheets exports work, our own template works.
// We keep this inline rather than pulling in papaparse because the only
// consumers are the two CSV dialogs and the round-trip is closed-loop
// (we control both the writer and the reader).

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          // Escaped quote inside a quoted field
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(cell);
        cell = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++; // CRLF
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += ch;
      }
    }
  }
  // Flush trailing cell / row if the file didn't end with a newline.
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/// Quote a cell when it contains a comma, double quote, or newline — and
/// double any internal quotes. This is the inverse of `parseCsvRows` and
/// produces output every major CSV parser handles correctly.
function escapeCsvCell(value: string): string {
  if (value === '') return '';
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
