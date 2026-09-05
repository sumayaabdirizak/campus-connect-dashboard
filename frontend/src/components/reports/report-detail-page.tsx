'use client';

import { useEffect, useRef } from 'react';
import { ArrowLeft, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api-client';
import { useReport } from '@/lib/reports/queries/entity-reports';
import { REPORT_SCOPE_META, type ReportScope } from '@/lib/reports/types';
import { exportReportCsv, exportReportPdf } from './export-report';
import { ReportCoverageStrip } from './report-coverage-strip';
import { ReportKpiCards } from './report-kpi-cards';
import { ReportOverviewChart } from './report-overview-chart-lazy';
import { ReportSectionBlock } from './report-section';
import { ReportSectionChartPanel } from './report-section-chart-lazy';
import { CARD, META, TITLE_LG } from './report-theme';

function reportErrorText(error: Error | null): string {
  if (!error) return 'Failed to load report';
  if (error instanceof ApiError) {
    const reason =
      error.data &&
      typeof error.data === 'object' &&
      error.data.details &&
      typeof error.data.details === 'object' &&
      error.data.details !== null &&
      'reason' in error.data.details
        ? String((error.data.details as { reason?: unknown }).reason ?? '')
        : '';
    return reason && reason !== error.message ? `${error.message} — ${reason}` : error.message;
  }
  return error.message;
}

const tabTriggerClass = cn(
  'rounded-none border-b-2 border-transparent bg-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground shadow-none',
  'data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none'
);

export function ReportDetailPage({
  scope,
  subjectId,
  period,
  dateWindow,
  onBack,
  filtersPanel,
  isGenerating = false
}: {
  scope: ReportScope;
  subjectId: string;
  period: string;
  dateWindow: { from?: string | null; to?: string | null };
  onBack: () => void;
  filtersPanel?: React.ReactNode;
  isGenerating?: boolean;
}) {
  const reportQuery = useReport(scope, subjectId, period, dateWindow);
  const report = reportQuery.data;
  const sections = report?.sections ?? [];
  const retriedKey = useRef<string | null>(null);

  // If we already have report data but a refresh left an error stuck on the
  // query, retry once quietly so the banner clears when the API is fine.
  useEffect(() => {
    if (!report || !reportQuery.error || reportQuery.isFetching) return;
    const key = `${scope}:${subjectId}:${period}`;
    if (retriedKey.current === key) return;
    retriedKey.current = key;
    const t = window.setTimeout(() => {
      void reportQuery.refetch();
    }, 400);
    return () => window.clearTimeout(t);
  }, [report, reportQuery, scope, subjectId, period]);


  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex min-w-0 items-center gap-3'>
          <Button
            variant='ghost'
            size='sm'
            onClick={onBack}
            className='h-8 shrink-0 gap-1 px-2 text-muted-foreground hover:text-foreground'
          >
            <ArrowLeft className='size-4' /> Back
          </Button>
          <div className='min-w-0'>
            <h1 className={`truncate ${TITLE_LG}`}>
              {report?.subject.name ?? '…'}
            </h1>
            {report ? (
              <p className={`truncate ${META}`}>
                {REPORT_SCOPE_META[report.scope].title}
              </p>
            ) : null}
          </div>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='h-9 gap-1.5'
            disabled={!report}
            onClick={() => report && exportReportPdf(report)}
          >
            <FileText className='size-4' /> PDF
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='h-9 gap-1.5'
            disabled={!report}
            onClick={() => report && exportReportCsv(report)}
          >
            <FileSpreadsheet className='size-4' /> Excel
          </Button>
        </div>
      </div>

      {filtersPanel}

      {reportQuery.isLoading || (reportQuery.isFetching && !report) || isGenerating ? (
        <p className={`flex items-center justify-center gap-2 py-16 ${CARD} ${META}`}>
          <Loader2 className='size-4 animate-spin' /> Loading…
        </p>
      ) : report ? (
        <div className={`overflow-hidden ${CARD}`}>
          {reportQuery.error ? (
            <p className='border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-center text-xs text-destructive'>
              Couldn’t refresh this report
              {reportQuery.error instanceof Error && reportQuery.error.message
                ? `: ${reportQuery.error.message}`
                : ''}
              . Showing the last loaded data.
            </p>
          ) : null}
          <Tabs defaultValue='overview' className='gap-0'>
            <div className='overflow-x-auto border-b border-border'>
              <TabsList className='h-auto w-full justify-start gap-0 rounded-none bg-transparent p-0'>
                <TabsTrigger value='overview' className={tabTriggerClass}>
                  Overview
                </TabsTrigger>
                {sections.map((section) => (
                  <TabsTrigger key={section.key} value={section.key} className={tabTriggerClass}>
                    {section.label}
                    {section.rows.length > 0 ? (
                      <span className='ml-1 text-xs tabular-nums text-muted-foreground'>
                        {section.rows.length}
                      </span>
                    ) : null}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value='overview' className='mt-0'>
              <ReportCoverageStrip report={report} />
              <ReportKpiCards report={report} />
              <div className='border-t border-border p-4'>
                <ReportOverviewChart report={report} embedded />
              </div>
            </TabsContent>

            {sections.map((section) => (
              <TabsContent key={section.key} value={section.key} className='mt-0 p-4'>
                <div className='flex flex-col gap-4'>
                  <ReportSectionChartPanel section={section} />
                  <ReportSectionBlock section={section} embedded />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      ) : reportQuery.error ? (
        <div className='space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-center'>
          <p className='text-sm text-destructive'>{reportErrorText(reportQuery.error)}</p>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='gap-1.5'
            onClick={() => void reportQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : null}
    </div>
  );
}
