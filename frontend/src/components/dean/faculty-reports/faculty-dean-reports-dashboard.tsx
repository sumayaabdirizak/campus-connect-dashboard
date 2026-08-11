'use client'

import type { FacultyReportFilterState } from './faculty-reports-filters'
import type { DeanReports } from '@/lib/dean/types'

export interface FacultyDeanReportsDashboardProps {
  data?: DeanReports;
  isLoading?: boolean;
  isRefreshing?: boolean;
  error?: string;
  filters: FacultyReportFilterState;
  onFiltersChange: (filters: FacultyReportFilterState) => void;
  onRefresh: () => void;
}

export function FacultyDeanReportsDashboard({
  data,
  isLoading,
  isRefreshing,
  error,
  filters,
  onFiltersChange,
  onRefresh,
}: FacultyDeanReportsDashboardProps) {
  return <div className="p-4">Faculty Dean Reports Dashboard</div>
}

export default FacultyDeanReportsDashboard
