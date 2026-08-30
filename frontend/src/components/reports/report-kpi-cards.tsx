'use client';

import type { LucideIcon } from 'lucide-react';
import {
  ClipboardList,
  FileText,
  FolderOpen,
  MessagesSquare,
  Megaphone,
  Users
} from 'lucide-react';
import type { Report, ReportSection } from '@/lib/reports/types';
import { countLabel } from './report-format';
import { KPI_LABEL, KPI_TILE, KPI_VALUE, META } from './report-theme';

const DOMAIN_ICON: Record<string, LucideIcon> = {
  quizzes: ClipboardList,
  assignments: FileText,
  resources: FolderOpen,
  discussions: MessagesSquare,
  announcements: Megaphone,
  clubs: Users
};

const STUDENT_HEADLINE: Record<string, { headline: string; context: string }> = {
  quizzes: { headline: 'quizAttempts', context: 'quizCount' },
  assignments: { headline: 'submissionCount', context: 'assignmentCount' },
  resources: { headline: 'resourceViews', context: 'resourceCount' }
};

function buildCard(section: ReportSection, scope: string) {
  const find = (key: string) => section.kpis.find((k) => k.key === key);

  if (scope === 'student') {
    const spec = STUDENT_HEADLINE[section.key];
    const headline = spec ? find(spec.headline) : undefined;
    const context = spec ? find(spec.context) : undefined;
    if (headline) {
      const ctxValue = context?.value ?? 0;
      return {
        label: headline.label,
        value: headline.value ?? 0,
        support: context ? `of ${ctxValue} ${countLabel(context.label, ctxValue)}` : null
      };
    }
  }

  const [primary, secondary] = section.kpis;
  const secValue = secondary?.value ?? 0;
  return {
    label: primary.label,
    value: primary.value ?? 0,
    support: secondary ? `${secValue} ${countLabel(secondary.label, secValue)}` : null
  };
}

const CARD_ACCENTS = [
  'border-l-[#3B82F6] bg-[#EFF6FF] dark:bg-blue-950/30',
  'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/30',
  'border-l-violet-500 bg-violet-50 dark:bg-violet-950/30',
  'border-l-amber-500 bg-amber-50 dark:bg-amber-950/30',
  'border-l-cyan-500 bg-cyan-50 dark:bg-cyan-950/30',
  'border-l-rose-500 bg-rose-50 dark:bg-rose-950/30'
];

export function ReportKpiCards({ report }: { report: Report }) {
  const cards = report.sections
    .filter((s) => s.kpis.length > 0)
    .map((s, i) => ({
      key: s.key,
      ...buildCard(s, report.scope),
      Icon: DOMAIN_ICON[s.key] ?? ClipboardList,
      accent: CARD_ACCENTS[i % CARD_ACCENTS.length]
    }));

  if (cards.length === 0) return null;

  return (
    <div className='grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4'>
      {cards.map((c) => (
        <div
          key={c.key}
          className={`flex items-center gap-3 rounded-xl border border-[#E5E7EB] border-l-4 px-4 py-4 dark:border-border ${c.accent}`}
        >
          <span
            className={`grid size-11 shrink-0 place-items-center rounded-lg ${KPI_TILE}`}
          >
            <c.Icon className='size-5' aria-hidden />
          </span>
          <div className='min-w-0'>
            <p className={`truncate ${KPI_LABEL}`}>{c.label}</p>
            <p className={KPI_VALUE}>{c.value.toLocaleString()}</p>
            {c.support ? <p className={`truncate ${META}`}>{c.support}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
