import {
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
} from 'lucide-react';
import type { DeanReports } from '@/lib/dean/types';
import {
  downloadFacultyReportsCsv,
  printFacultyReport,
} from './faculty-reports-export';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { showToast } from '@/lib/notifications';

export function FacultyDeanReportsHeader({
  data,
  isRefreshing,
  onRefresh,
}: {
  data?: DeanReports;
  isRefreshing?: boolean;
  onRefresh: () => void;
}) {
  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    if (!data) return;
    if (format === 'csv' || format === 'excel') {
      downloadFacultyReportsCsv(data);
      showToast('success', `${format.toUpperCase()} export started`);
      return;
    }
    printFacultyReport(
      'Academic reports',
      `<p>${data.scope.facultyName} — ${data.scope.periodLabel}</p>`
    );
  };

  return (
    <div className='flex flex-wrap items-center justify-end gap-2'>
      <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size='sm' variant='outline'>
              <Download className='mr-1.5 size-4' />
              Export Report
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuLabel>Export center</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleExport('pdf')}>
              <FileText className='mr-2 size-4' /> PDF — Current view
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('excel')}>
              <FileSpreadsheet className='mr-2 size-4' /> Excel — Filtered data
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('csv')}>
              <Download className='mr-2 size-4' /> CSV — Complete faculty report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size='sm' variant='outline' onClick={onRefresh} disabled={isRefreshing}>
          <RefreshCw className={cn('mr-1.5 size-4', isRefreshing && 'animate-spin')} />
          Refresh Data
        </Button>
    </div>
  );
}
