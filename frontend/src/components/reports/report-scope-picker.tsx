'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  BarChart3,
  BookOpen,
  GraduationCap,
  UserCog,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { REPORT_SCOPES, REPORT_SCOPE_META, type ReportScope } from '@/lib/reports/types';

const SCOPE_UI: Record<
  ReportScope,
  { icon: typeof BookOpen; title: string; hint: string }
> = {
  course: {
    icon: BookOpen,
    title: 'A course',
    hint: 'Quizzes, assignments and materials in one class'
  },
  teacher: {
    icon: UserCog,
    title: 'A teacher',
    hint: 'What a lecturer has created and how classes are used'
  },
  student: {
    icon: GraduationCap,
    title: 'A student',
    hint: 'Progress and participation across courses'
  },
  batch: {
    icon: Users,
    title: 'A batch',
    hint: 'Whole cohort — sections and courses together'
  },
  faculty: {
    icon: BarChart3,
    title: 'A faculty',
    hint: 'Faculty-wide teaching and student activity'
  }
};

export function parseReportScope(raw: string | null | undefined): ReportScope | null {
  if (raw && REPORT_SCOPES.includes(raw as ReportScope)) return raw as ReportScope;
  return null;
}

/** Plain-language scope chooser — one tap, no jargon. */
export function ReportScopePicker({ scope }: { scope: ReportScope | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const pick = (next: ReportScope) => {
    const params = new URLSearchParams();
    params.set('scope', next);
    router.replace(`/dashboard/reports?${params.toString()}`, { scroll: false });
  };

  return (
    <div className='space-y-2'>
      <p className='text-sm font-medium text-[#101828] dark:text-foreground'>
        What do you want to check?
      </p>
      <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'>
        {REPORT_SCOPES.map((s) => {
          const ui = SCOPE_UI[s];
          const Icon = ui.icon;
          const active = s === scope;
          return (
            <button
              key={s}
              type='button'
              onClick={() => pick(s)}
              className={cn(
                'flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-all duration-200',
                active
                  ? 'border-[#3B82F6] bg-[#EFF6FF] shadow-[0_1px_2px_rgba(16,24,40,0.06)] dark:border-blue-500 dark:bg-blue-950/30'
                  : 'border-[#E5E7EB] bg-white hover:border-[#98A2B3] hover:bg-[#F9FAFB] dark:border-border dark:bg-card'
              )}
            >
              <span
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-lg',
                  active
                    ? 'bg-[#3B82F6] text-white'
                    : 'bg-[#F2F4F7] text-[#3B82F6] dark:bg-muted'
                )}
              >
                <Icon className='size-4' aria-hidden />
              </span>
              <span className='min-w-0'>
                <span className='block text-sm font-semibold text-[#101828] dark:text-foreground'>
                  {ui.title}
                </span>
                <span className='mt-0.5 block text-xs leading-snug text-[#667085] dark:text-muted-foreground'>
                  {ui.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function scopePlural(scope: ReportScope) {
  return REPORT_SCOPE_META[scope].plural;
}
