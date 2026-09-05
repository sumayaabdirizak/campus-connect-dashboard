import type {
  CreateQuizInput,
  Quiz,
  QuizQuestionType
} from '@/lib/course-details/services/quizzes-types';
import { questionTypesForMode } from '../quiz-question-types';
import { serverNow } from '@/lib/server-clock';
import { isUploadedOfflineQuiz } from '@/lib/course-details/services/quiz-total-points';

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
  /// Offline only: build in app vs upload paper file.
  offline_delivery: 'built' | 'uploaded';
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
  is_draft: false,
  open_at_local: '',
  close_at_local: '',
  shuffle_questions: false,
  shuffle_answers: false,
  passing_score: 50,
  timing_mode: 'flexible',
  confidence_scoring: false,
  moduleSelect: NO_MODULE,
  mode: 'online',
  offline_delivery: 'built',
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
  return isoToLocalInput(new Date(serverNow()).toISOString());
}

/** Fixed-mode cohort end: "Available from" + time limit (matches backend). */
export function fixedWindowEndLocal(
  openAtLocal: string,
  durationMinutes: number
): string {
  if (!openAtLocal) return '';
  const start = new Date(openAtLocal);
  if (Number.isNaN(start.getTime())) return '';
  return isoToLocalInput(
    new Date(start.getTime() + durationMinutes * 60_000).toISOString()
  );
}

function isPastLocal(value: string): boolean {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) || d.getTime() < serverNow();
}

function isSameSavedTime(iso: string | null | undefined, local: string): boolean {
  return isoToLocalInput(iso) === local;
}

export function fromQuiz(q: Quiz): FormState {
  return {
    title: q.title,
    description: q.description ?? '',
    duration_minutes: q.duration_minutes,
    is_draft: q.is_draft,
    open_at_local: isoToLocalInput(q.open_at),
    // Fixed mode ignores close_at server-side — don't surface a stale value.
    close_at_local:
      (q.timing_mode ?? 'flexible') === 'fixed'
        ? ''
        : isoToLocalInput(q.close_at),
    shuffle_questions: q.shuffle_questions,
    shuffle_answers: q.shuffle_answers,
    passing_score: q.passing_score,
    timing_mode: q.timing_mode ?? 'flexible',
    confidence_scoring: !!q.confidence_scoring,
    moduleSelect: q.moduleId == null ? NO_MODULE : String(q.moduleId),
    mode: q.mode ?? 'online',
    offline_delivery:
      q.mode === 'offline' && q.offline_delivery === 'uploaded' ? 'uploaded' : 'built',
    ...marksPlanFieldsFromQuiz(q)
  };
}

export function isUploadedOfflineForm(s: FormState): boolean {
  return s.mode === 'offline' && s.offline_delivery === 'uploaded';
}

export function toPayload(s: FormState): CreateQuizInput {
  const uploaded = isUploadedOfflineForm(s);
  return {
    title: s.title.trim(),
    description: s.description.trim() || undefined,
    duration_minutes: s.duration_minutes,
    is_draft: s.is_draft,
    open_at: localInputToIso(s.open_at_local),
    close_at:
      s.timing_mode === 'fixed' ? null : localInputToIso(s.close_at_local),
    shuffle_questions: s.shuffle_questions,
    shuffle_answers: s.shuffle_answers,
    passing_score: s.passing_score,
    timing_mode: s.timing_mode,
    confidence_scoring: s.confidence_scoring,
    moduleId: s.moduleSelect === NO_MODULE ? null : Number(s.moduleSelect),
    mode: s.mode,
    offline_delivery: s.mode === 'offline' ? s.offline_delivery : null,
    maxMarks: uploaded ? s.marksPlanTotal : undefined,
    marksPlan: uploaded
      ? null
      : s.marksPlanTypes.length === 0
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
  if (!s.title.trim()) return 'Give the quiz a name first';
  if (s.duration_minutes < 1) return 'Students need at least 1 minute';
  if (s.passing_score < 0 || s.passing_score > 100) return 'Pass mark must be between 0 and 100';
  if (
    s.open_at_local &&
    isPastLocal(s.open_at_local) &&
    !isSameSavedTime(editing?.open_at, s.open_at_local)
  ) {
    return 'Pick a future “Available from” date';
  }
  if (s.timing_mode !== 'fixed') {
    if (
      s.close_at_local &&
      isPastLocal(s.close_at_local) &&
      !isSameSavedTime(editing?.close_at, s.close_at_local)
    ) {
      return 'Pick a future “Available until” date';
    }
    if (s.open_at_local && s.close_at_local) {
      if (new Date(s.open_at_local) >= new Date(s.close_at_local)) {
        return '"Available until" needs to be after "Available from"';
      }
    }
  }
  if (s.timing_mode === 'fixed' && !s.open_at_local) {
    return 'Set "Available from" — everyone needs a shared start time';
  }
  if (!s.is_draft && editing && isUploadedOfflineQuiz(editing)) {
    if (!editing.paperFile || (editing.maxMarks ?? 0) <= 0) {
      return 'Upload the quiz file and set marks before publishing';
    }
    return null;
  }
  if (!s.is_draft && editing && (editing.questions?.length ?? 0) === 0) {
    return 'Add at least one question before publishing';
  }
  return null;
}

/** Create-quiz gate: AI / questions unlock only after Basics + Marking are set. */
export function quizConfigReadyMessage(s: FormState): string | null {
  if (!s.title.trim()) return 'Give the quiz a name in Basics first';
  if (s.duration_minutes < 1) return 'Set a duration of at least 1 minute';
  if (s.mode === 'online' && s.timing_mode === 'fixed' && !s.open_at_local) {
    return 'Set “Available from” on the Timing tab';
  }
  if (isUploadedOfflineForm(s)) {
    if (s.marksPlanTotal < 1) return 'Set total marks on the Marking tab';
    return null;
  }
  if (s.marksPlanTypes.length === 0) {
    return 'Pick at least one question type on the Marking tab';
  }
  if (s.marksPlanTotal < 1) return 'Set total marks on the Marking tab';
  const allocated = s.marksPlanTypes.reduce(
    (sum, t) => sum + (s.marksPlanAllocations[t] ?? 0),
    0
  );
  if (s.marksPlanTypes.some((t) => (s.marksPlanAllocations[t] ?? 0) < 1)) {
    return 'Give each selected question type at least 1 mark';
  }
  if (allocated !== s.marksPlanTotal) {
    return 'Finish splitting total marks across question types on Marking';
  }
  return null;
}

export function isQuizConfigReady(s: FormState): boolean {
  return quizConfigReadyMessage(s) == null;
}

export function scheduleBadgeFor(editing: Quiz | null) {
  if (!editing) return null;
  const now = serverNow();
  const o = editing.open_at ? new Date(editing.open_at).getTime() : null;
  const c = editing.close_at ? new Date(editing.close_at).getTime() : null;
  if (o && now < o) return { label: 'Scheduled', tone: 'info' as const };
  if (c && now > c) return { label: 'Closed', tone: 'destructive' as const };
  if (o || c) return { label: 'Open', tone: 'success' as const };
  return null;
}

export type QuizSettingsTab = 'basics' | 'schedule' | 'behavior' | 'marks';

/// When a quiz has questions but no saved marks plan (common for quizzes built
/// before sections existed, or via the old question-only editor), derive a
/// planning layout from the questions already on the quiz so the Marking tab
/// and section blocks aren't blank on edit. Does not write to the server —
/// the teacher still clicks Save quiz to persist it.
export function inferMarksPlanFromQuestions(
  questions: Quiz['questions'] | undefined,
  mode: FormState['mode'] = 'online'
): Pick<FormState, 'marksPlanTotal' | 'marksPlanTypes' | 'marksPlanAllocations'> | null {
  const list = questions ?? [];
  if (list.length === 0) return null;

  const allocations: Partial<Record<QuizQuestionType, number>> = {};
  for (const q of list) {
    const type = q.question_type;
    allocations[type] = (allocations[type] ?? 0) + (Number(q.points) || 0);
  }

  const typeOrder = questionTypesForMode(mode);
  const marksPlanTypes = typeOrder.filter((t) => (allocations[t] ?? 0) > 0);
  if (marksPlanTypes.length === 0) return null;

  const marksPlanTotal = marksPlanTypes.reduce(
    (sum, t) => sum + (allocations[t] ?? 0),
    0
  );

  return { marksPlanTotal, marksPlanTypes, marksPlanAllocations: allocations };
}

function marksPlanFieldsFromQuiz(q: Quiz): Pick<
  FormState,
  'marksPlanTotal' | 'marksPlanTypes' | 'marksPlanAllocations'
> {
  const mode = q.mode ?? 'online';
  if (q.mode === 'offline' && q.offline_delivery === 'uploaded') {
    const total = q.maxMarks > 0 ? q.maxMarks : (q.marksPlan?.totalMarks ?? 10);
    return {
      marksPlanTotal: total,
      marksPlanTypes: [],
      marksPlanAllocations: {}
    };
  }
  const typeOrder = questionTypesForMode(mode);

  if (q.marksPlan) {
    return {
      marksPlanTotal: q.marksPlan.totalMarks,
      marksPlanTypes: typeOrder.filter((t) =>
        Object.prototype.hasOwnProperty.call(q.marksPlan!.allocations, t)
      ),
      marksPlanAllocations: q.marksPlan.allocations
    };
  }

  return (
    inferMarksPlanFromQuestions(q.questions, mode) ?? {
      marksPlanTotal: 10,
      marksPlanTypes: [],
      marksPlanAllocations: {}
    }
  );
}
