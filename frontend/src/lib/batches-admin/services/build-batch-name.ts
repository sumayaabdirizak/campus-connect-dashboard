export function buildBatchName(
  programCode: string,
  facultyCode: string,
  batchNumber: string
): string {
  const num = batchNumber.trim();
  if (!programCode || !facultyCode || !num) return '';
  return `${programCode}-${facultyCode}-B${num}`;
}

export function parseAcademicYearStart(yearName: string): number {
  const start = yearName.split('/')[0]?.trim();
  const parsed = Number(start);
  return Number.isFinite(parsed) ? parsed : new Date().getFullYear();
}
