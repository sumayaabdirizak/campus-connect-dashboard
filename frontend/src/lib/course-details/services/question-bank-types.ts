import type {
  QuizModuleSummary,
  QuizQuestionType
} from './quizzes-types';

/// Single option attached to a bank question. Distinct from `QuizOption` —
/// `QuestionOptionBank` lives in its own table so editing a bank row never
/// mutates a quiz that already imported from it.
export interface BankOption {
  id: number;
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

/// A reusable question in the offering's bank. The teacher creates these
/// once and drops them into any quiz on the same offering via the "Add from
/// Bank" picker. `difficulty` and `topic` drive the filter UI; both are
/// free-form-ish (difficulty is constrained to "easy" | "medium" | "hard"
/// in the backend Joi schema, but stored as a String).
export interface BankQuestion {
  id: number;
  question_text: string;
  question_type: QuizQuestionType;
  points: number;
  topic: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  is_active: boolean;
  created_at: string;
  /// Offering scope. Always set on rows returned from the new endpoints —
  /// the controller filters out legacy unscoped rows so we never have to
  /// branch on null here.
  courseOfferingId: number;
  moduleId: number | null;
  module?: QuizModuleSummary | null;
  bankOptions: BankOption[];
}

/// Body for the create/edit form. Options are required for MCQ / True-False
/// and forbidden for short-answer; the backend Joi schema enforces this and
/// returns a 400 if the form lets the teacher submit a malformed row.
export interface CreateBankQuestionInput {
  question_text: string;
  question_type: QuizQuestionType;
  points: number;
  topic?: string | null;
  difficulty?: 'easy' | 'medium' | 'hard' | null;
  moduleId?: number | null;
  options?: Array<{
    option_text: string;
    is_correct: boolean;
    order_index?: number;
  }>;
}

export type UpdateBankQuestionInput = Partial<CreateBankQuestionInput> & {
  is_active?: boolean;
};

/// Filter state for the list query. Mirrors the backend query-params surface.
/// `moduleId: 'none'` selects only bank questions NOT pinned to a chapter.
export interface BankQuestionFilters {
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  search?: string;
  moduleId?: number | 'none';
}

/// Counted topic returned from `/topics` so the dropdown can show "Sorting (12)"
/// without an extra query for each topic.
export interface BankTopicCount {
  name: string;
  count: number;
}

/// "Import N bank rows into this quiz." Backend copies each one into a
/// fresh `QuizQuestion` so the quiz becomes independent of subsequent
/// edits to the bank row.
export interface ImportToQuizInput {
  questionIds: number[];
}

/// Body for the AI-generate endpoint. The teacher describes what they want;
/// the backend asks Claude to draft N questions matching the spec. Nothing
/// is persisted server-side — the response is a transient preview that the
/// teacher cherry-picks from via the bulk-import endpoint.
export interface GenerateQuestionsInput {
  prompt: string;
  /// Optional pasted reference content (a chapter, a lecture, etc.). When
  /// present, the model is instructed to ground questions in this material
  /// rather than its general knowledge. Capped at ~30k chars server-side.
  sourceMaterial?: string;
  count: number;
  /// Subset of types to use. Empty array = let the model decide the mix.
  questionTypes: QuizQuestionType[];
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
}

/// A single generated question — same shape as `CreateBankQuestionInput`
/// the bulk-import endpoint already accepts, so the teacher's confirmed
/// selection rides the existing import pipeline without translation. We
/// also surface `explanation` so the preview UI can render it (the bank
/// model stores explanations on the QuizQuestion side, not on Question; for
/// now we drop the explanation when persisting via import, but the preview
/// still shows it as part of the human review step).
export interface GeneratedQuestion {
  question_text: string;
  question_type: QuizQuestionType;
  points: number;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation: string;
  options: Array<{
    option_text: string;
    is_correct: boolean;
  }>;
}

export interface GenerateQuestionsResponse {
  questions: GeneratedQuestion[];
  /// Token usage from the Claude call. Useful for cost telemetry; not shown
  /// in the default UI. Fields are optional because older SDK versions or
  /// failures may not populate them.
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}
