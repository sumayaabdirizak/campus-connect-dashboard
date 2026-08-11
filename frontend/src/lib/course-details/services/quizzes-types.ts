export type QuizQuestionType = 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER';

export interface OptionInput {
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

export interface CreateQuestionInput {
  question_text: string;
  question_type: QuizQuestionType;
  points: number;
  correct_answer?: string | null;
  explanation?: string | null;
  options?: OptionInput[];
}

export interface UpdateQuestionInput {
  question_text?: string;
  question_type?: QuizQuestionType;
  points?: number;
  correct_answer?: string | null;
  explanation?: string | null;
  options?: OptionInput[];
}

export interface QuizOption {
  id: number;
  option_text: string;
  is_correct?: boolean;
  order_index?: number;
}

export interface QuizQuestion {
  id: number;
  question_text: string;
  question_type: QuizQuestionType;
  points: number;
  order_index: number;
  /// Teacher-authored explanation rendered on the review screen.
  /// Only populated on the question detail responses (full quiz fetch and
  /// the submit-attempt review payload).
  explanation?: string | null;
  options: QuizOption[];
}

/// Lightweight module summary embedded in a Quiz payload — the list query
/// and the create/update responses use `select: { id, title, position,
/// publishedAt }` on the relation. Enough to render the chapter accordion
/// header without a separate modules fetch.
export interface QuizModuleSummary {
  id: number;
  title: string;
  position: number;
  /// `null` while unpublished. Students still see quizzes in unpublished
  /// modules (the publish gate on a quiz is `is_draft`, not the module), but
  /// the UI may want to mark the bucket as draft.
  publishedAt: string | null;
}

export interface Quiz {
  id: number;
  title: string;
  description: string | null;
  duration_minutes: number;
  courseOfferingId: number;
  is_draft: boolean;
  open_at: string | null;
  close_at: string | null;
  shuffle_questions: boolean;
  shuffle_answers: boolean;
  max_attempts: number;
  passing_score: number;
  /// "flexible" — student starts whenever they open it
  /// "fixed"    — timed window, everyone starts when the schedule opens
  timing_mode: 'flexible' | 'fixed';
  /// Per-student time budget override in fixed mode. null = use duration_minutes.
  scheduled_duration: number | null;
  /// When true, students declare LOW/MED/HIGH confidence on each objective
  /// answer and scoring uses the Cologne / Bristol multiplier table:
  ///   HIGH+right = 100%, MED+right = 75%, LOW+right = 50%
  ///   HIGH+wrong = -50%, MED+wrong = 0, LOW+wrong = 0
  /// Optional; defaults to false when omitted.
  confidence_scoring?: boolean;
  /// Optional chapter / unit grouping. `null` lands the quiz in the
  /// "Ungrouped" bucket. The full module record can be loaded via the
  /// resources-feature `useModules(courseOfferingId)` hook.
  moduleId: number | null;
  /// Inlined summary returned by the backend. Use this for grouping +
  /// rendering the chapter label without an extra fetch.
  module?: QuizModuleSummary | null;
  created_at: string;
  updated_at: string;
  questions?: QuizQuestion[];
  _count?: { attempts: number };
  /// Teacher list only — count of submitted attempts with at least one
  /// short-answer answer awaiting manual grading. Drives the "X need
  /// grading" badge on the quiz card so the teacher sees pending work
  /// without drilling into each quiz.
  pendingGradingCount?: number;
  /// Surfaced by `GET /quiz-taking/:id/available` only — total attempts the
  /// student has already used (including any in-progress row). Undefined on
  /// the teacher list query.
  attemptsUsed?: number;
  /// Convenience pair to `attemptsUsed`. `max_attempts - attemptsUsed`,
  /// floored at 0. Drives the "Attempt N of M" badge on student cards.
  attemptsLeft?: number;
  /// Set when the student has an unsubmitted attempt waiting. The card uses
  /// this to swap "Start" for "Continue (12 min left)" with no extra fetch.
  inProgressAttempt?: {
    id: number;
    started_at: string;
    expires_at: string | null;
  } | null;
  /// The student's most recent SUBMITTED attempt (never the in-progress
  /// one). Null until the first submit. `passed` is null for ungraded
  /// short-answer attempts where score isn't yet decided.
  lastAttempt?: {
    /// Attempt id — lets the student re-open the full per-question review
    /// from the quiz card via `GET /quiz-taking/attempts/:id`.
    id: number;
    score: number | null;
    submitted_at: string;
    is_graded: boolean;
    passed: boolean | null;
  } | null;
  /// Best score across all submitted attempts on this quiz (or null if no
  /// scored attempts yet). Lets the card surface "Best: 88%" alongside the
  /// most-recent badge.
  bestScore?: number | null;
}

export interface CreateQuizInput {
  title: string;
  description?: string;
  duration_minutes?: number;
  is_draft?: boolean;
  open_at?: string | null;
  close_at?: string | null;
  shuffle_questions?: boolean;
  shuffle_answers?: boolean;
  max_attempts?: number;
  passing_score?: number;
  timing_mode?: 'flexible' | 'fixed';
  scheduled_duration?: number | null;
  /// Chapter / module bucket. Omit or send `null` for Ungrouped. The server
  /// rejects ids that belong to a different course offering.
  moduleId?: number | null;
  /// Cologne/Bristol confidence-based scoring — off by default.
  confidence_scoring?: boolean;
  /// Optional inline questions — create the quiz AND its questions in one
  /// request. Used by the "Generate a whole quiz with AI" flow so the teacher
  /// lands in the builder with a populated draft. Omit for a normal
  /// empty-quiz create. Capped at 100 server-side. `order_index` is stamped
  /// from array position by the backend, so it isn't sent here.
  questions?: Array<{
    question_text: string;
    question_type: QuizQuestionType;
    points: number;
    correct_answer?: string | null;
    explanation?: string | null;
    options?: OptionInput[];
  }>;
}

/// PATCH body for editing an existing quiz. All fields optional; backend
/// requires at least one (Joi `.min(1)`).
export type UpdateQuizInput = Partial<CreateQuizInput>;

export type QuizConfidence = 'LOW' | 'MED' | 'HIGH';

export interface QuizAttemptAnswer {
  id?: number;
  questionId: number;
  selected_option_id?: number | null;
  text_answer?: string | null;
  /// Only sent / persisted on confidence-scored quizzes. Optional on every
  /// other quiz — the backend ignores it when `quiz.confidence_scoring`
  /// is false.
  confidence?: QuizConfidence | null;
}

export interface QuizStartResponse {
  attempt: {
    id: number;
    /// ISO timestamp the attempt started — server-stamped.
    started_at: string;
    /// ISO timestamp at which the server will auto-submit the attempt if the
    /// student hasn't submitted by then. The client's countdown is computed
    /// as `expires_at - Date.now()` so refresh / clock skew can't lose time.
    expires_at: string | null;
    violations_count: number;
    warnings_shown: number;
  };
  /// Server's `new Date()` at response time — clients can adjust for clock
  /// skew if precision matters (`skew = Date.now() - serverTime`).
  serverTime: string;
  quiz: {
    id: number;
    title: string;
    duration_minutes: number;
    passing_score: number;
    timing_mode: string;
    open_at: string | null;
    close_at: string | null;
    /// Echoed by the backend so the client knows to render the LOW/MED/HIGH
    /// confidence selector beneath every objective option.
    confidence_scoring?: boolean;
  };
  questions: Array<{
    id: number;
    question_text: string;
    question_type: QuizQuestionType;
    points: number;
    order_index: number;
    options: Array<{ id: number; option_text: string }>;
  }>;
  /// Answers persisted on this attempt so far. Empty on a fresh start; on
  /// resume this lets the client restore the exact pre-refresh state.
  savedAnswers: Array<{
    questionId: number;
    selected_option_id: number | null;
    text_answer: string | null;
    confidence?: QuizConfidence | null;
  }>;
  totalQuestions: number;
  totalPoints: number;
}

export interface SaveAttemptAnswersResponse {
  attemptId: number;
  savedCount: number;
  savedAt: string; // ISO timestamp from the server
}

/// Response from `POST /quiz-taking/attempts/:attemptId/violation`. The
/// client increments locally too, but always trusts the server number on
/// success — covers cases where two violations land in the same tick.
export interface ReportViolationResponse {
  violations_count: number;
  warnings_shown: number;
  /// True iff the server finalized the attempt because the warning limit
  /// was crossed. The client should redirect to the post-submit review and
  /// stop sending further violations.
  auto_closed: boolean;
  /// Server-configured warning ceiling. Exposed so the UI can render
  /// "1 of N" without hard-coding 3.
  max_warnings: number;
}

export interface QuizAttempt {
  id: number;
  quizId: number;
  studentId: number;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  grade: number | null;
  /// Cheating signals: # of violations the student triggered (tab leave,
  /// copy/paste, etc.) and the # of those that crossed the warn threshold.
  /// These are surfaced post-submit on the attempt review and the teacher's
  /// attempts table monitoring column.
  violations_count?: number;
  warnings_shown?: number;
  /// True once a teacher has manually graded the short-answer questions.
  /// Auto-graded MCQ/T-F attempts come back from submit with `is_graded:
  /// false` and remain so until the teacher saves grades — that lets the
  /// attempts list surface a "Needs grading" badge.
  is_graded?: boolean;
  closure_reason?: string | null;
  student?: { id: number; full_name: string; number?: string };
  answers?: Array<{
    id: number;
    questionId: number;
    selected_option_id: number | null;
    text_answer: string | null;
    is_correct: boolean | null;
    points_earned: number | null;
    /// Present on the teacher attempts list payload (`include: { question: true }`).
    /// Lets the grader render the question text and points cap without
    /// re-joining against the quiz tree.
    question?: {
      id: number;
      question_text: string;
      question_type: QuizQuestionType;
      points: number;
      order_index: number;
    };
  }>;
  /// Populated on the post-submit response so the client can render the
  /// review screen without an extra round-trip. The quiz tree includes the
  /// canonical correct options + the teacher's explanation per question.
  quiz?: Quiz & { questions: QuizQuestion[] };
}

/// Body for the teacher's manual short-answer grading endpoint.
export interface GradedAnswerInput {
  answerId: number;
  points_earned: number;
  is_correct?: boolean;
}

/// Response from the GET /quizzes/:quizId/export endpoint. The CSV is
/// serialized server-side so all clients see the same layout. `filename` is
/// a slug-of-the-quiz-title that the browser uses as the download default —
/// the frontend may override it if the teacher wants a different name.
export interface ExportQuizCsvResponse {
  filename: string;
  csv: string;
  questionCount: number;
}

/// One row in the CSV import payload — shape matches what the shared
/// `parseQuestionCsv` util emits for 'quiz' mode. The backend re-validates
/// each row at the schema layer so a hand-crafted POST can't bypass the
/// client-side checks.
export interface ImportQuizCsvRowInput {
  question_text: string;
  question_type: QuizQuestionType;
  points: number;
  explanation?: string | null;
  options?: Array<{
    option_text: string;
    is_correct: boolean;
    order_index?: number;
  }>;
}

export interface ImportQuizCsvInput {
  questions: ImportQuizCsvRowInput[];
}

export interface ImportQuizCsvResponse {
  success: boolean;
  imported: number;
}

/// Per-question stats returned by GET /quizzes/:id/analytics. `correctRate`
/// is null until at least one graded attempt exists (short-answer rows
/// awaiting grading don't push it down — they sit in `pending`).
export interface QuestionAnalytic {
  id: number;
  question_text: string;
  question_type: QuizQuestionType;
  points: number;
  order_index: number;
  totalAnswered: number;
  correctCount: number;
  correctRate: number | null;
  pending: number;
  /// Per-option pick counts for MCQ / T-F. Omitted on SHORT_ANSWER.
  optionStats?: Array<{
    optionId: number;
    option_text: string;
    is_correct: boolean;
    pickedCount: number;
    pickedPct: number;
  }>;
}

export interface QuizAnalytics {
  totalSubmissions: number;
  avgScore: number | null;
  questions: QuestionAnalytic[];
}
