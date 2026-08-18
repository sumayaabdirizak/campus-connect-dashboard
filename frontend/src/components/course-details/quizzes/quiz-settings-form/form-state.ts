import type {
  CreateQuizInput,
  Quiz,
  QuizQuestionType
} from '@/lib/course-details/services/quizzes-types';

export const NO_MODULE = '__none__';

export interface FormState {
  title: string;
  description: string;
  duration_minutes: number;
  is_draft: boolean;
  open_at_local: string;
  close_at_local: string;
  shuffle_questions: boolean;
  shuffle_answers: boolean;
  passing_score: number;
  timing_mode: 'flexible' | 'fixed';
  confidence_scoring: boolean;
  moduleSelect: string;
  mode: 'online' | 'offline';
  // Marks-distribution plan — `marksPlanTypes` is the set of sections the
  // teacher has switched on; `marksPlanAllocations` only has meaningful
  // values for types present in that set.
  marksPlanTotal: number;
  marksPlanTypes: QuizQuestionType[];
  marksPlanAllocations: Partial<Record<QuizQuestionType, number>>;
}

export const BLANK: FormState = {
  title: '',
  description: '',
  duration_minutes: 30,
  is_draft: true,
  open_at_local: '',
  close_at_local: '',
  shuffle_questions: false,
  shuffle_answers: false,
  passing_score: 50,
  timing_mode: 'flexible',
  confidence_scoring: false,
  moduleSelect: NO_MODULE,
  mode: 'online',
  marksPlanTotal: 10,
  marksPlanTypes: [],
  marksPlanAllocations: {}
};

export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function localInputToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/// Current moment in the same "local datetime-input" string shape as
/// `isoToLocalInput`, used to floor Opens/Closes pickers at "now" so a
/// teacher can't schedule a quiz into the past.
export function nowLocalInput(): string {
  return isoToLocalInput(new Date().toISOString());
}

export function fromQuiz(q: Quiz): FormState {
  return {
    title: q.title,
    description: q.description ?? '',
    duration_minutes: q.duration_minutes,
    is_draft: q.is_draft,
    open_at_local: isoToLocalInput(q.open_at),
    close_at_local: isoToLocalInput(q.close_at),
    shuffle_questions: q.shuffle_questions,
    shuffle_answers: q.shuffle_answers,
    passing_score: q.passing_score,
    timing_mode: q.timing_mode ?? 'flexible',
    confidence_scoring: !!q.confidence_scoring,
    moduleSelect: q.moduleId == null ? NO_MODULE : String(q.moduleId),
    mode: q.mode ?? 'online',
    marksPlanTotal: q.marksPlan?.totalMarks ?? 10,
    marksPlanTypes: q.marksPlan
      ? (Object.keys(q.marksPlan.allocations) as QuizQuestionType[])
      : [],
    marksPlanAllocations: q.marksPlan?.allocations ?? {}
  };
}

export function toPayload(s: FormState): CreateQuizInput {
  return {
    title: s.title.trim(),
    description: s.description.trim() || undefined,
    duration_minutes: s.duration_minutes,
    is_draft: s.is_draft,
    open_at: localInputToIso(s.open_at_local),
    close_at: localInputToIso(s.close_at_local),
    shuffle_questions: s.shuffle_questions,
    shuffle_answers: s.shuffle_answers,
    passing_score: s.passing_score,
    timing_mode: s.timing_mode,
    confidence_scoring: s.confidence_scoring,
    moduleId: s.moduleSelect === NO_MODULE ? null : Number(s.moduleSelect),
    mode: s.mode,
    marksPlan:
      s.marksPlanTypes.length === 0
        ? null
        : {
            totalMarks: s.marksPlanTotal,
            allocations: Object.fromEntries(
              s.marksPlanTypes.map((t) => [t, s.marksPlanAllocations[t] ?? 0])
            )
          }
  };
}

export function validateForm(s: FormState, editing: Quiz | null): string | null {
  if (!s.title.trim()) return 'Title is required';
  if (s.duration_minutes < 1) return 'Duration must be at least 1 minute';
  if (s.passing_score < 0 || s.passing_score > 100) return 'Passing score must be 0-100';
  if (s.open_at_local && s.close_at_local) {
    if (new Date(s.open_at_local) >= new Date(s.close_at_local)) {
      return 'Open time must be before close time';
    }
  }
  if (s.timing_mode === 'fixed' && !s.open_at_local) {
    return 'Fixed mode requires an Open time';
  }
  if (!s.is_draft && editing && (editing.questions?.length ?? 0) === 0) {
    return 'Add at least one question before publishing';
  }
  if (!s.is_draft && !editing) {
    return 'Save as a draft first, then publish after adding questions';
  }
  return null;
}

export function scheduleBadgeFor(editing: Quiz | null) {
  if (!editing) return null;
  const now = Date.now();
  const o = editing.open_at ? new Date(editing.open_at).getTime() : null;
  const c = editing.close_at ? new Date(editing.close_at).getTime() : null;
  if (o && now < o) return { label: 'Scheduled', tone: 'info' as const };
  if (c && now > c) return { label: 'Closed', tone: 'destructive' as const };
  if (o || c) return { label: 'Open', tone: 'success' as const };
  return null;
}

export type QuizSettingsTab = 'basics' | 'schedule' | 'behavior' | 'marks';
