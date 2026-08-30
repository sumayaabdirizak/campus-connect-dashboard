'use client';

import { ArrowLeft, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useReport } from '@/lib/reports/queries/entity-reports';
import { REPORT_SCOPE_META, type ReportScope } from '@/lib/reports/types';
import { exportReportCsv, exportReportPdf } from './export-report';
import { ReportCoverageStrip } from './report-coverage-strip';
import { ReportKpiCards } from './report-kpi-cards';
import { ReportOverviewChart } from './report-overview-chart-lazy';
import { ReportSectionBlock } from './report-section';
import { ReportSectionChartPanel } from './report-section-chart-lazy';
import { CARD, META, TITLE_LG } from './report-theme';

const tabTriggerClass = cn(
  'rounded-none border-b-2 border-transparent bg-transparent px-3 py-2.5 text-sm font-medium text-[#667085] shadow-none',
  'data-[state=active]:border-[#3B82F6] data-[state=active]:bg-transparent data-[state=active]:text-[#101828] data-[state=active]:shadow-none',
  'dark:text-muted-foreground dark:data-[state=active]:text-foreground'
);

export function ReportDetailPage({
  scope,
  subjectId,
  period,
  window,
  onBack,
  filtersPanel,
  isGenerating = false
}: {
  scope: ReportScope;
  subjectId: string;
  period: string;
  window: { from?: string | null; to?: string | null };
  onBack: () => void;
  filtersPanel?: React.ReactNode;
  isGenerating?: boolean;
}) {
  const reportQuery = useReport(scope, subjectId, period, window);
  const report = reportQuery.data;
  const sections = report?.sections ?? [];

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex min-w-0 items-center gap-3'>
          <Button
            variant='ghost'
            size='sm'
            onClick={onBack}
            className='h-8 shrink-0 gap-1 px-2 text-[#667085] hover:text-[#101828] dark:text-muted-foreground'
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
            className='h-9 gap-1.5 border-[#D0D5DD] dark:border-border'
            disabled={!report}
            onClick={() => report && exportReportPdf(report)}
          >
            <FileText className='size-4' /> PDF
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='h-9 gap-1.5 border-[#D0D5DD] dark:border-border'
            disabled={!report}
            onClick={() => report && exportReportCsv(report)}
          >
            <FileSpreadsheet className='size-4' /> Excel
          </Button>
        </div>
      </div>

      {filtersPanel}

      {reportQuery.isLoading || reportQuery.isFetching || isGenerating ? (
        <p className={`flex items-center justify-center gap-2 py-16 ${CARD} ${META}`}>
          <Loader2 className='size-4 animate-spin' /> Loading…
        </p>
      ) : reportQuery.error ? (
        <p className='rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-center text-sm text-destructive'>
          {reportQuery.error.message}
        </p>
      ) : report ? (
        <div className={`overflow-hidden ${CARD}`}>
          <Tabs defaultValue='overview' className='gap-0'>
            <div className='overflow-x-auto border-b border-[#E5E7EB] dark:border-border'>
              <TabsList className='h-auto w-full justify-start gap-0 rounded-none bg-transparent p-0'>
                <TabsTrigger value='overview' className={tabTriggerClass}>
                  Overview
                </TabsTrigger>
                {sections.map((section) => (
                  <TabsTrigger key={section.key} value={section.key} className={tabTriggerClass}>
                    {section.label}
                    {section.rows.length > 0 ? (
                      <span className='ml-1 text-xs tabular-nums text-[#98A2B3]'>
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
              <div className='border-t border-[#E5E7EB] p-4 dark:border-border'>
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
      ) : null}
    </div>
  );
}
