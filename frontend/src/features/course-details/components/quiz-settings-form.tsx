'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { BookOpen, Calendar, Clock, FileText, Shuffle, Trophy, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { CreateQuizInput, Quiz, UpdateQuizInput } from '../api/quizzes-types';
import type { CourseModule } from '../api/resources-types';

/// Sentinel for the "Ungrouped" option in the module Select. shadcn-ui's
/// Select rejects an empty-string value, so we use this constant and map it
/// back to `null` when building the payload.
const NO_MODULE = '__none__';

/**
 * Convert an ISO datetime string ↔ the value/format expected by
 * `<input type="datetime-local">`. The HTML input wants "YYYY-MM-DDTHH:mm"
 * in LOCAL time; ISO from the server is UTC. We use the JS Date to do the
 * conversion both ways so the teacher's wall-clock view stays accurate.
 */
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // Strip seconds — datetime-local only accepts to the minute.
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

interface FormState {
  title: string;
  description: string;
  duration_minutes: number;
  is_draft: boolean;
  open_at_local: string; // "YYYY-MM-DDTHH:mm" or ""
  close_at_local: string;
  shuffle_questions: boolean;
  shuffle_answers: boolean;
  max_attempts: number;
  passing_score: number;
  timing_mode: 'flexible' | 'fixed';
  scheduled_duration: number | null;
  /// Numeric module id as a string for the Select, or `NO_MODULE` for the
  /// Ungrouped bucket. Kept as a string to play nicely with shadcn Select
  /// (which only accepts string values).
  moduleSelect: string;
}

const BLANK: FormState = {
  title: '',
  description: '',
  duration_minutes: 30,
  is_draft: false,
  open_at_local: '',
  close_at_local: '',
  shuffle_questions: false,
  shuffle_answers: false,
  max_attempts: 1,
  passing_score: 50,
  timing_mode: 'flexible',
  scheduled_duration: null,
  moduleSelect: NO_MODULE,
};

function fromQuiz(q: Quiz): FormState {
  return {
    title: q.title,
    description: q.description ?? '',
    duration_minutes: q.duration_minutes,
    is_draft: q.is_draft,
    open_at_local: isoToLocalInput(q.open_at),
    close_at_local: isoToLocalInput(q.close_at),
    shuffle_questions: q.shuffle_questions,
    shuffle_answers: q.shuffle_answers,
    max_attempts: q.max_attempts,
    passing_score: q.passing_score,
    timing_mode: q.timing_mode ?? 'flexible',
    scheduled_duration: q.scheduled_duration ?? null,
    moduleSelect: q.moduleId == null ? NO_MODULE : String(q.moduleId),
  };
}

function toPayload(s: FormState): CreateQuizInput {
  return {
    title: s.title.trim(),
    description: s.description.trim() || undefined,
    duration_minutes: s.duration_minutes,
    is_draft: s.is_draft,
    open_at: localInputToIso(s.open_at_local),
    close_at: localInputToIso(s.close_at_local),
    shuffle_questions: s.shuffle_questions,
    shuffle_answers: s.shuffle_answers,
    max_attempts: s.max_attempts,
    passing_score: s.passing_score,
    timing_mode: s.timing_mode,
    scheduled_duration: s.scheduled_duration,
    // Always emit `moduleId` (including `null`) so a teacher can move a quiz
    // out of a module via the Settings dialog. The PATCH route distinguishes
    // null (set to Ungrouped) from undefined (leave alone) on its own.
    moduleId: s.moduleSelect === NO_MODULE ? null : Number(s.moduleSelect),
  };
}

interface QuizSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /// When set, the dialog is in "edit" mode and pre-populates from this quiz.
  editing: Quiz | null;
  pending: boolean;
  /// Course modules ("chapters") the quiz can be filed under. The parent
  /// pre-fetches them via `useModules(courseOfferingId)` so the dialog stays
  /// a pure presenter. An empty array hides the selector entirely — no point
  /// rendering a one-item dropdown.
  modules?: CourseModule[];
  onSubmit: (
    payload:
      | { mode: 'create'; data: CreateQuizInput }
      | { mode: 'edit'; quizId: number; data: UpdateQuizInput }
  ) => void;
}

/**
 * Settings dialog for a quiz — handles both Create and Edit. Organized into
 * four tabs so the teacher isn't overwhelmed on first encounter:
 *
 *   Basics    — title, description, draft toggle
 *   Schedule  — open/close window, timing mode, scheduled duration
 *   Behavior  — duration, attempts, shuffle questions / answers
 *   Grading   — pass threshold
 *
 * The form state is local; we only `onSubmit` the cleaned-up payload. Date
 * fields are stored as "local datetime" strings and converted to/from UTC
 * ISO at the boundary so what the teacher sees in the inputs is what they
 * mean in their own timezone.
 */
export function QuizSettingsDialog({
  open,
  onOpenChange,
  editing,
  pending,
  modules = [],
  onSubmit
}: QuizSettingsDialogProps) {
  const [form, setForm] = useState<FormState>(BLANK);
  const [tab, setTab] = useState<'basics' | 'schedule' | 'behavior' | 'grading'>('basics');

  const handleOpenChange = (next: boolean) => {
    if (next) {
      // Re-seed every time the dialog opens — create mode resets to blank;
      // edit mode hydrates from the latest quiz row.
      setForm(editing ? fromQuiz(editing) : BLANK);
      setTab('basics');
    }
    onOpenChange(next);
  };

  const validate = (s: FormState): string | null => {
    if (!s.title.trim()) return 'Title is required';
    if (s.duration_minutes < 1) return 'Duration must be at least 1 minute';
    if (s.passing_score < 0 || s.passing_score > 100) return 'Passing score must be 0-100';
    if (s.max_attempts < 1) return 'Allowed attempts must be at least 1';
    if (s.open_at_local && s.close_at_local) {
      if (new Date(s.open_at_local) >= new Date(s.close_at_local)) {
        return 'Open time must be before close time';
      }
    }
    if (s.timing_mode === 'fixed') {
      if (!s.open_at_local) return 'Fixed mode requires an Open time';
      if (s.scheduled_duration != null && s.scheduled_duration < 1) {
        return 'Scheduled duration must be at least 1 minute';
      }
    }
    return null;
  };

  const handleSubmit = () => {
    const err = validate(form);
    if (err) {
      toast.error(err);
      return;
    }
    const data = toPayload(form);
    if (editing) {
      onSubmit({ mode: 'edit', quizId: editing.id, data });
    } else {
      onSubmit({ mode: 'create', data });
    }
  };

  // Render-time hint: schedule window status badge (only in edit mode where
  // the dates can be evaluated against `now`).
  const scheduleBadge = (() => {
    if (!editing) return null;
    const now = Date.now();
    const o = editing.open_at ? new Date(editing.open_at).getTime() : null;
    const c = editing.close_at ? new Date(editing.close_at).getTime() : null;
    if (o && now < o) return { label: 'Scheduled', tone: 'secondary' as const };
    if (c && now > c) return { label: 'Closed', tone: 'destructive' as const };
    if (o || c) return { label: 'Open', tone: 'default' as const };
    return null;
  })();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <DialogTitle>{editing ? 'Quiz settings' : 'New quiz'}</DialogTitle>
            {editing?.is_draft && <Badge variant='secondary'>Draft</Badge>}
            {scheduleBadge && <Badge variant={scheduleBadge.tone}>{scheduleBadge.label}</Badge>}
          </div>
          <DialogDescription>
            {editing
              ? 'Change scheduling, behavior, or grading. Existing attempts are not re-graded.'
              : 'Configure how this quiz opens, behaves while taken, and scores.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className='mt-2'>
          <TabsList className='grid grid-cols-4 w-full'>
            <TabsTrigger value='basics' className='gap-1'>
              <FileText className='w-3.5 h-3.5' /> Basics
            </TabsTrigger>
            <TabsTrigger value='schedule' className='gap-1'>
              <Calendar className='w-3.5 h-3.5' /> Schedule
            </TabsTrigger>
            <TabsTrigger value='behavior' className='gap-1'>
              <Shuffle className='w-3.5 h-3.5' /> Behavior
            </TabsTrigger>
            <TabsTrigger value='grading' className='gap-1'>
              <Trophy className='w-3.5 h-3.5' /> Grading
            </TabsTrigger>
          </TabsList>

          {/* ── Basics ─────────────────────────────────────────────────── */}
          <TabsContent value='basics' className='space-y-3 mt-4'>
            <div className='space-y-1.5'>
              <Label htmlFor='quiz-title'>Title *</Label>
              <Input
                id='quiz-title'
                placeholder='e.g. Midterm — Chapters 1–4'
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='quiz-desc'>Description</Label>
              <Textarea
                id='quiz-desc'
                rows={3}
                placeholder='Topics covered, any tips for the student…'
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {/* Module / chapter selector — hidden when the offering has no
                modules at all, since the only option would be "Ungrouped"
                and that's already the default behaviour. */}
            {modules.length > 0 && (
              <div className='space-y-1.5'>
                <Label className='flex items-center gap-1'>
                  <BookOpen className='w-3.5 h-3.5' /> Chapter
                </Label>
                <Select
                  value={form.moduleSelect}
                  onValueChange={(v) => setForm({ ...form, moduleSelect: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_MODULE}>Ungrouped</SelectItem>
                    {[...modules]
                      .sort((a, b) => a.position - b.position)
                      .map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.title}
                          {!m.publishedAt ? ' · Draft' : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className='text-[11px] text-muted-foreground'>
                  Groups this quiz under the chapter on the Quizzes tab. Students see
                  the chapter label on the quiz card.
                </p>
              </div>
            )}

            <div className='flex items-center justify-between rounded-md border p-3'>
              <div className='space-y-0.5'>
                <p className='text-sm font-medium'>Save as draft</p>
                <p className='text-[11px] text-muted-foreground'>
                  Hidden from students. Useful while you're still adding questions.
                </p>
              </div>
              <Switch
                checked={form.is_draft}
                onCheckedChange={(v) => setForm({ ...form, is_draft: v })}
              />
            </div>
          </TabsContent>

          {/* ── Schedule ───────────────────────────────────────────────── */}
          <TabsContent value='schedule' className='space-y-3 mt-4'>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label htmlFor='quiz-open'>Opens</Label>
                <Input
                  id='quiz-open'
                  type='datetime-local'
                  value={form.open_at_local}
                  onChange={(e) => setForm({ ...form, open_at_local: e.target.value })}
                />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='quiz-close'>Closes</Label>
                <Input
                  id='quiz-close'
                  type='datetime-local'
                  value={form.close_at_local}
                  onChange={(e) => setForm({ ...form, close_at_local: e.target.value })}
                />
              </div>
            </div>
            <p className='text-[11px] text-muted-foreground'>
              Leave both blank for an always-open quiz. Times use your local timezone.
            </p>

            <div className='space-y-1.5'>
              <Label>Timing mode</Label>
              <Select
                value={form.timing_mode}
                onValueChange={(v) =>
                  setForm({ ...form, timing_mode: v as 'flexible' | 'fixed' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='flexible'>
                    Flexible — student starts whenever they open it
                  </SelectItem>
                  <SelectItem value='fixed'>
                    Fixed — timed window, everyone starts at "Opens"
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.timing_mode === 'fixed' && (
              <div className='space-y-1.5 rounded-md border p-3 bg-muted/30'>
                <Label htmlFor='quiz-sched-dur' className='flex items-center gap-1'>
                  <Clock className='w-3.5 h-3.5' />
                  Scheduled duration (min)
                </Label>
                <Input
                  id='quiz-sched-dur'
                  type='number'
                  min={1}
                  max={480}
                  value={form.scheduled_duration ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      scheduled_duration: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder={`Defaults to ${form.duration_minutes} min`}
                />
                <p className='text-[11px] text-muted-foreground'>
                  Optional override. If set, this is the per-student time budget in fixed mode.
                </p>
              </div>
            )}
          </TabsContent>

          {/* ── Behavior ───────────────────────────────────────────────── */}
          <TabsContent value='behavior' className='space-y-3 mt-4'>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label htmlFor='quiz-dur' className='flex items-center gap-1'>
                  <Clock className='w-3.5 h-3.5' /> Duration (min)
                </Label>
                <Input
                  id='quiz-dur'
                  type='number'
                  min={1}
                  max={480}
                  value={form.duration_minutes}
                  onChange={(e) =>
                    setForm({ ...form, duration_minutes: Math.max(1, Number(e.target.value) || 1) })
                  }
                />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='quiz-attempts'>Allowed attempts</Label>
                <Input
                  id='quiz-attempts'
                  type='number'
                  min={1}
                  max={100}
                  value={form.max_attempts}
                  onChange={(e) =>
                    setForm({ ...form, max_attempts: Math.max(1, Number(e.target.value) || 1) })
                  }
                />
              </div>
            </div>

            <div className='flex items-center justify-between rounded-md border p-3'>
              <div className='space-y-0.5'>
                <p className='text-sm font-medium flex items-center gap-1.5'>
                  <Shuffle className='w-3.5 h-3.5' /> Shuffle questions
                </p>
                <p className='text-[11px] text-muted-foreground'>
                  Reorder questions independently per attempt — discourages copying.
                </p>
              </div>
              <Switch
                checked={form.shuffle_questions}
                onCheckedChange={(v) => setForm({ ...form, shuffle_questions: v })}
              />
            </div>

            <div className='flex items-center justify-between rounded-md border p-3'>
              <div className='space-y-0.5'>
                <p className='text-sm font-medium flex items-center gap-1.5'>
                  <Shuffle className='w-3.5 h-3.5' /> Shuffle answer choices
                </p>
                <p className='text-[11px] text-muted-foreground'>
                  Re-order options on MCQ / True-False per attempt.
                </p>
              </div>
              <Switch
                checked={form.shuffle_answers}
                onCheckedChange={(v) => setForm({ ...form, shuffle_answers: v })}
              />
            </div>
          </TabsContent>

          {/* ── Grading ────────────────────────────────────────────────── */}
          <TabsContent value='grading' className='space-y-3 mt-4'>
            <div className='space-y-1.5'>
              <Label htmlFor='quiz-pass'>Passing score (%)</Label>
              <Input
                id='quiz-pass'
                type='number'
                min={0}
                max={100}
                value={form.passing_score}
                onChange={(e) =>
                  setForm({
                    ...form,
                    passing_score: Math.min(100, Math.max(0, Number(e.target.value) || 0))
                  })
                }
              />
              <p className='text-[11px] text-muted-foreground'>
                Students see "Passed" or "Failed" on review when their score crosses this line.
              </p>
            </div>

            {editing && (editing._count?.attempts ?? 0) > 0 && (
              <div className='flex items-start gap-2 rounded-md border border-amber-300/40 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs'>
                <AlertTriangle className='w-4 h-4 text-amber-600 shrink-0 mt-0.5' />
                <div>
                  <p className='font-medium text-amber-900 dark:text-amber-200'>
                    {editing._count?.attempts ?? 0} attempt
                    {(editing._count?.attempts ?? 0) === 1 ? '' : 's'} already submitted
                  </p>
                  <p className='text-amber-800 dark:text-amber-300'>
                    Changing the passing score does NOT re-grade past attempts. Their stored
                    score and pass/fail flag are frozen at submit time.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? 'Saving…' : editing ? 'Save changes' : 'Create quiz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
