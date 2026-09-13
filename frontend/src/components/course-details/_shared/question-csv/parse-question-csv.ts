import type { QuizQuestionType } from '@/lib/course-details/services/quizzes-types';
import { parseCsvRows } from './csv-tokenizer';
import type { ParseResult, ParsedQuestionRow } from './types';

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
  const colExplanation = mode === 'quiz' ? indexOf('explanation') : -1;

  const parsedRows: ParsedQuestionRow[] = [];
  const errors: ParseResult['errors'] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every((c) => c.trim() === '')) continue;

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
    const points = colPoints >= 0 ? Number(row[colPoints]) || 1 : 1;
    const topic = colTopic >= 0 ? (row[colTopic] ?? '').trim() || null : null;
    const diffRaw =
      colDifficulty >= 0 ? (row[colDifficulty] ?? '').trim().toLowerCase() : '';
    const difficulty =
      diffRaw === 'easy' || diffRaw === 'medium' || diffRaw === 'hard'
        ? (diffRaw as 'easy' | 'medium' | 'hard')
        : null;
    const explanation =
      colExplanation >= 0 ? (row[colExplanation] ?? '').trim() || null : null;

    let options: ParsedQuestionRow['options'] = [];
    if (type !== 'SHORT_ANSWER') {
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
