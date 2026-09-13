'use client';

import { format } from 'date-fns';
import {
  PosTable,
  PosTableBody,
  PosTableCell,
  PosTableHead,
  PosTableHeaderCell,
  PosTableRow
} from '@/features/pos/components/pos-table';
import type { ReportSection as Section } from '@/lib/reports/types';
import { cn } from '@/lib/utils';
import { countLabel } from './report-format';
import { BODY, CARD, META, TITLE_MD } from './report-theme';

/// Columns come from the rows the API sends, so a domain can add a field
/// without the UI needing to know about it.
const HEADER_LABELS: Record<string, string> = {
  title: 'Title',
  name: 'Name',
  course: 'Course',
  status: 'Status',
  mode: 'Mode',
  type: 'Type',
  questions: 'Questions',
  attempts: 'Attempts',
  avgScore: 'Avg score',
  due: 'Due',
  submissions: 'Submissions',
  graded: 'Graded',
  views: 'Views',
  created: 'Created',
  replies: 'Replies',
  reactions: 'Reactions',
  published: 'Published',
  reads: 'Reads',
  comments: 'Comments',
  acknowledgements: 'Acks',
  members: 'Members',
  lastActivity: 'Last activity'
};

const NUMERIC = new Set([
  'questions', 'attempts', 'avgScore', 'submissions', 'graded', 'views',
  'replies', 'reactions', 'reads', 'comments', 'acknowledgements', 'members'
]);

const DATE_KEYS = new Set(['due', 'created', 'published', 'lastActivity']);

/** `id` is a database key — useful in the CSV, noise on screen. */
const HIDDEN_COLUMNS = new Set(['id']);

/**
 * Measures the API still reports — and the CSV still carries — but that do not
 * earn a place on screen, because each one restates something already beside
 * it: "marked %" is graded ÷ submissions, "submitted" trails "attempts", and a
 * third view metric adds nothing next to views and never-opened.
 */
const HIDDEN_KPIS = new Set(['quizSubmitted', 'gradedPct', 'resourceViewers']);

/// Status as a quiet pill, matching PosTable row badges.
const STATUS_TONE: Record<string, string> = {
  Published: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  Open: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  APPROVED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  PENDING: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  Draft: 'bg-muted text-muted-foreground',
  Closed: 'bg-muted text-muted-foreground'
};

function renderCell(key: string, value: unknown) {
  if (value === null || value === undefined || value === '') {
    return <span className='text-muted-foreground'>—</span>;
  }
  if (DATE_KEYS.has(key)) {
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? '—' : format(d, 'd MMM yyyy');
  }
  if (key === 'status') {
    const s = String(value);
    return (
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
          STATUS_TONE[s] ?? 'bg-muted text-muted-foreground'
        }`}
      >
        {s}
      </span>
    );
  }
  if (key === 'avgScore') return `${value}%`;
  if (typeof value === 'number' && value === 0) {
    return <span className='text-muted-foreground'>0</span>;
  }
  return String(value);
}

export function ReportSectionBlock({
  section,
  embedded = false
}: {
  section: Section;
  embedded?: boolean;
}) {
  const columns =
    section.rows.length > 0
      ? Object.keys(section.rows[0]).filter((c) => !HIDDEN_COLUMNS.has(c))
      : [];

  if (section.rows.length === 0) {
    if (embedded) {
      return (
        <p className={`py-8 text-center ${META}`}>No activity in this period</p>
      );
    }
    return (
      <section
        className='flex items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-card px-4 py-3'
      >
        <h2 className={`text-sm font-medium ${BODY}`}>{section.label}</h2>
        <span className={META}>No activity in this period</span>
      </section>
    );
  }

  const summary = section.kpis.filter(
    (k) => k.value !== null && !HIDDEN_KPIS.has(k.key)
  );

  return (
    <section className={embedded ? 'overflow-hidden' : cn('overflow-hidden', CARD)}>
      <header
        className={
          embedded
            ? 'mb-2 flex flex-wrap items-start justify-between gap-2'
            : 'flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3'
        }
      >
        <div className='min-w-0'>
          {!embedded ? <h2 className={TITLE_MD}>{section.label}</h2> : null}
          {summary.length > 0 ? (
            <p
              className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${META} ${embedded ? '' : 'mt-1'}`}
            >
              {summary.map((k) => (
                <span key={k.label}>
                  <span className='font-semibold tabular-nums text-foreground'>
                    {k.value!.toLocaleString()}
                    {k.unit ?? ''}
                  </span>{' '}
                  {countLabel(k.label, k.value!)}
                </span>
              ))}
            </p>
          ) : null}
        </div>
        <span className={`shrink-0 tabular-nums ${META}`}>
          {section.rows.length} row{section.rows.length === 1 ? '' : 's'}
        </span>
      </header>

      <div
        className={
          embedded
            ? 'max-h-[min(28rem,50vh)] overflow-auto rounded-lg border border-border'
            : 'max-h-[26rem] overflow-auto'
        }
      >
        <PosTable>
          <PosTableHead className='sticky top-0 z-10'>
            <tr>
              {columns.map((c) => (
                <PosTableHeaderCell
                  key={c}
                  align={NUMERIC.has(c) ? 'right' : 'left'}
                >
                  {HEADER_LABELS[c] ?? c}
                </PosTableHeaderCell>
              ))}
            </tr>
          </PosTableHead>
          <PosTableBody>
            {section.rows.map((row, i) => (
              <PosTableRow key={i}>
                {columns.map((c) => (
                  <PosTableCell
                    key={c}
                    align={NUMERIC.has(c) ? 'right' : 'left'}
                    className={cn(
                      NUMERIC.has(c) && 'tabular-nums',
                      c === 'title' || c === 'name'
                        ? 'font-medium'
                        : 'text-muted-foreground'
                    )}
                  >
                    {renderCell(c, row[c])}
                  </PosTableCell>
                ))}
              </PosTableRow>
            ))}
          </PosTableBody>
        </PosTable>
      </div>
    </section>
  );
}
