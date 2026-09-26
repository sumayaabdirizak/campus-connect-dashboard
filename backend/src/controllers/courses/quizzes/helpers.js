import { prisma } from '../../../db/prisma.js';

export async function resolveModuleIdForOffering(rawModuleId, courseOfferingId) {
  if (rawModuleId === undefined) return undefined; // not touching the field
  if (rawModuleId === null) return null;
  const mod = await prisma.courseModule.findUnique({
    where: { id: Number(rawModuleId) },
    select: { id: true, courseOfferingId: true },
  });
  if (!mod || mod.courseOfferingId !== courseOfferingId) {
    const err = new Error('Module does not belong to this course');
    err.status = 400;
    throw err;
  }
  return mod.id;
}

export function assertQuizIsDraft(quiz) {
  if (!quiz.is_draft) {
    const err = new Error(
      'Cannot change questions on a published quiz. Switch it back to draft first.'
    );
    err.status = 400;
    throw err;
  }
}

/** Short-answer questions are manually graded (see attempt-grader) — allowed
 * in both online and offline quizzes. Kept as a no-op call site so future
 * per-mode restrictions have one place to land. */
export function assertQuestionTypeAllowedForQuiz(_quiz, _questionType) {}

export function assertMarksPlanAllowedForMode(_mode, _marksPlan) {}

export function assertQuestionsAllowedForMode(_mode, _questions) {}

/** Uploaded paper quiz — teacher file + course marks, no in-app questions. */
export function isUploadedOfflineQuiz(quiz) {
  return quiz?.mode === 'offline' && quiz?.offline_delivery === 'uploaded';
}

/** Max points for grading / offline score entry. */
export function resolveQuizAttemptMaxPoints(quiz, questions = []) {
  if (isUploadedOfflineQuiz(quiz) && Number(quiz.maxMarks) > 0) {
    return quiz.maxMarks;
  }
  return (questions ?? []).reduce((sum, q) => sum + (Number(q.points) || 0), 0);
}

export function normalizeOfflineDelivery(mode, offlineDelivery) {
  if (mode !== 'offline') return null;
  return offlineDelivery === 'uploaded' ? 'uploaded' : 'built';
}

/** Strip answer keys (and optionally explanations) from a quiz payload. */
export function stripQuizAnswerKeys(quiz) {
  return {
    ...quiz,
    questions: (quiz.questions ?? []).map((q) => {
      const { correct_answer: _ca, explanation: _ex, options, ...rest } = q;
      return {
        ...rest,
        options: (options ?? []).map(({ is_correct: _ic, ...opt }) => opt),
      };
    }),
  };
}

export function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (s === "") return "";
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildQuizCsv(questions) {
  // Find the max option count any question uses so the header carries
  // enough columns. Capped at 6 to match the parser's walk. Floor at 2 so
  // even an all-short-answer quiz still gets the canonical option columns
  // (makes the file template-shaped for the teacher to edit in Excel).
  const maxOptions = Math.min(
    6,
    Math.max(2, ...questions.map((q) => q.options?.length ?? 0))
  );
  const headerCells = [
    "question_text",
    "type",
    "points",
    "topic",
    "difficulty",
    "explanation",
  ];
  for (let n = 1; n <= maxOptions; n++) {
    headerCells.push(`option_${n}`);
    headerCells.push(`option_${n}_correct`);
  }

  const lines = [headerCells.join(",")];
  for (const q of questions) {
    const cells = [
      q.question_text,
      q.question_type,
      String(q.points),
      // Quiz questions don't carry topic/difficulty (those live on the bank
      // model). We emit blank cells so the column layout stays canonical;
      // teachers who want to add tags can fill them in and re-import as
      // bank questions later.
      "",
      "",
      q.explanation ?? "",
    ];
    const opts = (q.options ?? []).slice(0, maxOptions);
    for (let n = 0; n < maxOptions; n++) {
      const o = opts[n];
      cells.push(o ? o.option_text : "");
      cells.push(o ? (o.is_correct ? "true" : "false") : "");
    }
    lines.push(cells.map(csvEscape).join(","));
  }
  return lines.join("\n") + "\n";
}

/**
 * Persist a calendar-usable close_at for fixed-mode quizzes:
 * open_at + duration_minutes. Prefer an explicit close_at when provided.
 */
export function resolveQuizCloseAt({
  timing_mode,
  open_at,
  close_at,
  duration_minutes,
}) {
  const mode = timing_mode || 'flexible';
  if (mode !== 'fixed' && close_at) {
    return close_at instanceof Date ? close_at : new Date(close_at);
  }
  if (mode !== 'fixed' || !open_at) return null;
  const open = open_at instanceof Date ? open_at : new Date(open_at);
  if (Number.isNaN(open.getTime())) return null;
  const mins = Number(duration_minutes) || 0;
  if (mins < 1) return null;
  return new Date(open.getTime() + mins * 60_000);
}
