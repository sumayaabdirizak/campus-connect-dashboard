'use client'

export interface FacultyReportFilterState {
  period: string;
  departmentId?: string;
  studentLevel?: string;
  status?: string;
}

export const defaultFacultyReportFilters: FacultyReportFilterState = {
  period: '6m',
  departmentId: 'all',
  studentLevel: 'all',
  status: 'all',
}

export function FacultyReportsFilters() {
  return <div className="p-4">Faculty Reports Filters</div>
}

export default FacultyReportsFilters
