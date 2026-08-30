import type { DraftQuestion, QuizQuestionType } from '../quiz-builder/types';

export function optionLetter(index: number): string {
  return String.fromCharCode(65 + index); // A, B, C…
}

/// Order sections appear on the paper, matching the order the editor shows
/// them in so the printed document reads like what was built.
const PAPER_TYPE_ORDER: QuizQuestionType[] = ['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER'];

const PAPER_TYPE_TITLE: Record<QuizQuestionType, string> = {
  MCQ: 'Multiple Choice Questions',
  TRUE_FALSE: 'True / False Questions',
  SHORT_ANSWER: 'Short Answer Questions'
};

export interface PaperSection {
  /// 'A', 'B', … assigned over the sections that actually have questions,
  /// so a paper with no short answers still runs A, B with no gap.
  letter: string;
  title: string;
  type: QuizQuestionType;
  /// True / False prints its own True/False choices when the question
  /// carries no explicit options.
  isChoice: boolean;
  /// Each section numbers its own questions from 1, so a paper reads
  /// "Section A: 1-8, Section B: 1-2" rather than running one sequence
  /// straight through.
  items: Array<{ number: number; question: DraftQuestion }>;
}

/// One section per question type, rather than folding multiple-choice and
/// true/false together: they were previously merged into a single "choice"
/// group printed under a Multiple Choice heading, so true/false questions
/// appeared interleaved with the MCQs and no True/False section existed.
export function buildPaperSections(questions: DraftQuestion[]): PaperSection[] {
  const sections: PaperSection[] = [];

  for (const type of PAPER_TYPE_ORDER) {
    const ofType = questions.filter((q) => q.question_type === type);
    if (ofType.length === 0) continue;

    sections.push({
      letter: String.fromCharCode(65 + sections.length),
      title: PAPER_TYPE_TITLE[type],
      type,
      isChoice: type !== 'SHORT_ANSWER',
      items: ofType.map((question, i) => ({ number: i + 1, question }))
    });
  }

  // Anything whose type is outside the known order still has to print.
  const known = new Set<QuizQuestionType>(PAPER_TYPE_ORDER);
  const rest = questions.filter((q) => !known.has(q.question_type));
  if (rest.length > 0) {
    sections.push({
      letter: String.fromCharCode(65 + sections.length),
      title: 'Other Questions',
      type: 'SHORT_ANSWER',
      isChoice: false,
      items: rest.map((question, i) => ({ number: i + 1, question }))
    });
  }

  return sections;
}

/// Options as printed: a true/false question that was never given explicit
/// options still needs True and False on the paper.
export function paperOptions(question: DraftQuestion) {
  if (question.options.length > 0) return question.options;
  if (question.question_type === 'TRUE_FALSE') {
    return [
      { option_text: 'True', is_correct: false },
      { option_text: 'False', is_correct: false }
    ];
  }
  return [];
}

export function paperQuizTitle(title: string): string {
  const t = title.trim() || 'New Quiz';
  return t.toLowerCase().startsWith('quiz') ? t : `Quiz: ${t}`;
}
