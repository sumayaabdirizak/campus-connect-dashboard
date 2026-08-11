import type { ProgramInput } from './index';

/** Level → program code prefix (user can append / edit). */
export const LEVEL_CODE_PREFIX: Record<ProgramInput['level'], string> = {
  UNDERGRADUATE: 'BSC',
  POSTGRADUATE: 'MSC'
};

/** Build default code: BSC-CS / MSC-CS from level + department code. */
export function buildDefaultProgramCode(
  level: ProgramInput['level'],
  departmentCode?: string | null
): string {
  const prefix = LEVEL_CODE_PREFIX[level];
  const dept = departmentCode?.trim().toUpperCase().replace(/^-+|-+$/g, '');
  if (!dept) return `${prefix}-`;
  return `${prefix}-${dept}`;
}
