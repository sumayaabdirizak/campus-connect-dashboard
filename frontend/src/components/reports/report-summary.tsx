'use client';

import type { Report } from '@/lib/reports/types';
import { BODY, CARD, TITLE_MD } from './report-theme';

type Finding = { key: string; text: string; attention: boolean };

function buildFindings(report: Report): Finding[] {
  const value = (key: string) => report.kpis.find((k) => k.key === key)?.value ?? null;
  const num = (key: string) => value(key) ?? 0;
  const out: Finding[] = [];

  if (report.scope !== 'teacher' && report.coverage.students === 0) {
    out.push({
      key: 'no-students',
      attention: true,
      text: 'No students are enrolled, so nothing here has an audience yet.'
    });
  }

  const quizzes = num('quizCount');
  const published = num('quizPublished');
  const attempts = num('quizAttempts');
  if (quizzes > 0 && published === 0) {
    out.push({
      key: 'quiz-drafts',
      attention: true,
      text: `All ${quizzes} ${quizzes === 1 ? 'quiz is' : 'quizzes are'} still a draft — students cannot see ${quizzes === 1 ? 'it' : 'them'}.`
    });
  } else if (published > 0 && attempts === 0) {
    out.push({
      key: 'quiz-untouched',
      attention: true,
      text: `${published} published ${published === 1 ? 'quiz has' : 'quizzes have'} no attempts.`
    });
  }

  const submissions = num('submissionCount');
  if (submissions > 0 && num('gradedCount') === 0) {
    out.push({
      key: 'ungraded',
      attention: true,
      text: `${submissions} ${submissions === 1 ? 'submission is' : 'submissions are'} waiting to be marked.`
    });
  }

  const resources = num('resourceCount');
  if (resources > 0 && num('resourceViews') === 0) {
    out.push({
      key: 'unopened',
      attention: true,
      text: `None of the ${resources} ${resources === 1 ? 'resource has' : 'resources have'} been opened.`
    });
  }

  const avgScore = value('quizAvgScore');
  if (avgScore !== null && attempts > 0) {
    out.push({
      key: 'avg-score',
      attention: false,
      text: `Average quiz score is ${avgScore}% across ${attempts} ${attempts === 1 ? 'attempt' : 'attempts'}.`
    });
  }

  return out;
}

export function ReportSummary({ report }: { report: Report }) {
  const findings = buildFindings(report);
  if (findings.length === 0) return null;

  return (
    <section className={`px-5 py-4 ${CARD}`}>
      <h2 className={TITLE_MD}>Needs attention</h2>
      <ul className='mt-3 space-y-2'>
        {findings.map((f) => (
          <li
            key={f.key}
            className={`flex items-start gap-3 text-sm ${
              f.attention
                ? 'rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-[#344054] dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-foreground'
                : `${BODY} px-0 py-0`
            }`}
          >
            {f.attention ? (
              <span
                aria-hidden
                className='mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500'
              />
            ) : null}
            <span>{f.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
