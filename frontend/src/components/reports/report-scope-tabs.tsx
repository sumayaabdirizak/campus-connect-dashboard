'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  BarChart3,
  BookOpen,
  GraduationCap,
  Layers,
  UserCog,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACTIVITY_REPORT_SCOPES, REPORT_SCOPES, REPORT_SCOPE_META, type ReportScope } from '@/lib/reports/types';

const SCOPE_ICON: Record<ReportScope, typeof BookOpen> = {
  course: BookOpen,
  teacher: UserCog,
  student: GraduationCap,
  batch: Users,
  section: Layers,
  faculty: BarChart3
};

export function parseReportScope(raw: string | null | undefined): ReportScope {
  if (raw && REPORT_SCOPES.includes(raw as ReportScope)) return raw as ReportScope;
  return 'course';
}

/** DreamsPOS-style pill tabs — switch entity report scope on one page. */
export function ReportScopeTabs({ scope }: { scope: ReportScope }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setScope = (next: ReportScope) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('scope', next);
    router.replace(`/dashboard/reports?${params.toString()}`, { scroll: false });
  };

  return (
    <nav
      className='flex flex-wrap gap-2'
      aria-label='Report type'
    >
      {ACTIVITY_REPORT_SCOPES.map((s) => {
        const Icon = SCOPE_ICON[s];
        const active = s === scope;
        const label = REPORT_SCOPE_META[s].plural;
        return (
          <button
            key={s}
            type='button'
            onClick={() => setScope(s)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-200',
              active
                ? 'border-[#101828] bg-[#101828] text-white shadow-sm dark:border-foreground dark:bg-foreground dark:text-background'
                : 'border-[#D0D5DD] bg-white text-[#344054] hover:border-[#98A2B3] hover:bg-[#F2F4F7] dark:border-border dark:bg-card dark:text-foreground'
            )}
          >
            <Icon className='size-4 shrink-0' aria-hidden />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
