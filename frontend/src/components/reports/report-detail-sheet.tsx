'use client';

import { CalendarRange, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReport } from '@/lib/reports/queries/entity-reports';
import {
  REPORT_PERIODS,
  REPORT_SCOPE_META,
  type ReportScope
} from '@/lib/reports/types';
import { exportReportCsv } from './export-report';
import { ReportKpiCards } from './report-kpi-cards';
import { ReportOverviewChart } from './report-overview-chart-lazy';
import { ReportSectionBlock } from './report-section';
import { ReportSummary } from './report-summary';
import { LABEL_SM, SUBTITLE, TITLE_MD } from './report-theme';

const SHOWS_COURSE_COUNT = new Set<ReportScope>(['batch', 'faculty']);

export function ReportDetailSheet({
  scope,
  subjectId,
  period,
  onPeriodChange,
  onOpenChange
}: {
  scope: ReportScope;
  subjectId: string | null;
  period: string;
  onPeriodChange: (period: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const open = Boolean(subjectId);
  const meta = REPORT_SCOPE_META[scope];
  const reportQuery = useReport(scope, subjectId, period);
  const report = reportQuery.data;

  const periodPicker = (
    <Select value={period} onValueChange={onPeriodChange}>
      <SelectTrigger
        aria-label='Reporting period'
        className='h-9 w-36 border-[#D0D5DD] bg-white dark:border-border dark:bg-background'
      >
        <CalendarRange className='size-4 shrink-0 text-muted-foreground' aria-hidden />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {REPORT_PERIODS.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const sections = report?.sections.filter((s) => s.rows.length > 0 || s.kpis.length > 0) ?? [];
  const defaultTab = sections[0]?.key ?? 'quizzes';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='right'
        className='flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl lg:max-w-3xl'
      >
        <SheetHeader className='shrink-0 space-y-0 border-b border-[#E5E7EB] px-5 pb-4 pt-5 dark:border-border'>
          <p className={LABEL_SM}>{meta.title}</p>
          <SheetTitle className={`truncate pr-8 ${TITLE_MD}`}>
            {report?.subject.name ?? '…'}
          </SheetTitle>
          {report?.subject.subtitle ? (
            <SheetDescription className={SUBTITLE}>{report.subject.subtitle}</SheetDescription>
          ) : null}
          <div className='mt-3 flex flex-wrap items-center gap-2'>
            {periodPicker}
            <Button
              variant='outline'
              size='sm'
              className='h-9 gap-1.5 border-[#D0D5DD] dark:border-border'
              disabled={!report}
              onClick={() => report && exportReportCsv(report)}
            >
              <Download className='size-4' /> Export
            </Button>
          </div>
          {report ? (
            <dl className='mt-3 flex flex-wrap gap-x-6 gap-y-2'>
              {[
                ...report.subject.meta,
                ...(SHOWS_COURSE_COUNT.has(scope)
                  ? [{ label: 'Courses covered', value: String(report.coverage.courses) }]
                  : [])
              ].map((m) => (
                <div key={m.label}>
                  <dt className={LABEL_SM}>{m.label}</dt>
                  <dd className='text-sm font-semibold text-[#101828] dark:text-foreground'>
                    {m.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </SheetHeader>

        <div className='flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4'>
          {reportQuery.isLoading ? (
            <p className='flex items-center justify-center gap-2 py-16 text-sm text-[#667085]'>
              <Loader2 className='size-4 animate-spin' /> Building report…
            </p>
          ) : reportQuery.error ? (
            <p className='rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-6 text-center text-sm text-destructive'>
              {reportQuery.error.message}
            </p>
          ) : report ? (
            <div className='flex flex-col gap-4'>
              <ReportSummary report={report} />
              <ReportKpiCards report={report} />
              <ReportOverviewChart report={report} />

              {sections.length > 0 ? (
                <Tabs defaultValue={defaultTab} className='gap-3'>
                  <TabsList
                    className='h-auto w-full flex-wrap justify-start gap-1 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-1 dark:border-border dark:bg-muted/40'
                  >
                    {sections.map((s) => (
                      <TabsTrigger
                        key={s.key}
                        value={s.key}
                        className='rounded-md px-3 py-1.5 text-xs data-[state=active]:bg-white data-[state=active]:text-[#101828] data-[state=active]:shadow-sm dark:data-[state=active]:bg-card'
                      >
                        {s.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {sections.map((section) => (
                    <TabsContent key={section.key} value={section.key} className='mt-0'>
                      <ReportSectionBlock section={section} embedded />
                    </TabsContent>
                  ))}
                </Tabs>
              ) : null}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
