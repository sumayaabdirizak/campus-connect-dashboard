'use client'

export type FacultyReportFilterState = Record<string, unknown>

export const defaultFacultyReportFilters: FacultyReportFilterState = {}

export function FacultyReportsFilters() {
  return <div className="p-4">Faculty Reports Filters</div>
}

export default FacultyReportsFilters
