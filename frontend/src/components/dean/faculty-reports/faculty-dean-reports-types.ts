import type { DeanReports } from '@/lib/dean/types';
import type { FacultyReportFilterState } from './faculty-reports-filters';

export interface FacultyDeanReportsDashboardProps {
  data?: DeanReports;
  isLoading: boolean;
  isRefreshing?: boolean;
  error?: string;
  filters: FacultyReportFilterState;
  onFiltersChange: (next: FacultyReportFilterState) => void;
  onRefresh: () => void;
}
