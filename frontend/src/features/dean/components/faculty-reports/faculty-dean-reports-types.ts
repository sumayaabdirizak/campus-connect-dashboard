import type { DeanReports } from '@/features/dean/api/dean-api';
import type { FacultyReportFilterState } from '@/features/dean/components/faculty-reports/faculty-reports-filters';

export interface FacultyDeanReportsDashboardProps {
  data?: DeanReports;
  isLoading: boolean;
  isRefreshing?: boolean;
  error?: string;
  filters: FacultyReportFilterState;
  onFiltersChange: (next: FacultyReportFilterState) => void;
  onRefresh: () => void;
}
