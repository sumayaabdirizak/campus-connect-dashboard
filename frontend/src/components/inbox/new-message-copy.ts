import {
  isDeanRole,
  isOfficeStaffRole,
  isStudentRole,
  isTeacherRole,
} from '@shared/roles';

export type OfficeStaffDmScope = 'university' | 'faculty' | 'none' | 'courses';

export function newMessageCopyForRole(
  role: string | undefined,
  dmScope?: OfficeStaffDmScope | null
) {
  if (isDeanRole(role)) {
    return {
      description: "Browse faculty people or your Dean's Office staff — or search.",
      placeholder: 'Search by name…',
      emptySearch: 'No one matches that search.',
      emptyIdle: 'No teachers, students, or office staff found yet.',
      showRoleChips: 'dean' as const
    };
  }
  if (isOfficeStaffRole(role)) {
    if (dmScope === 'faculty') {
      return {
        description: 'Message people in your faculty only.',
        placeholder: 'Search by name…',
        emptySearch: 'No one matches that search.',
        emptyIdle: 'No people in your faculty yet.',
        showRoleChips: 'office' as const
      };
    }
    if (dmScope === 'university') {
      return {
        description: 'Message anyone across the university.',
        placeholder: 'Search by name…',
        emptySearch: 'No one matches that search.',
        emptyIdle: 'No people available yet.',
        showRoleChips: 'office' as const
      };
    }
    return {
      description: 'Browse people you can message — or search.',
      placeholder: 'Search by name…',
      emptySearch: 'No one matches that search.',
      emptyIdle: 'No people available in your office scope yet.',
      showRoleChips: 'office' as const
    };
  }
  if (isTeacherRole(role)) {
    return {
      description: 'Message your faculty dean or students in your courses.',
      placeholder: 'Search by name…',
      emptySearch: 'No one matches that search.',
      emptyIdle: 'No dean or course students found yet.',
      showRoleChips: null
    };
  }
  if (isStudentRole(role)) {
    return {
      description: 'Message teachers of your current courses.',
      placeholder: 'Search teacher…',
      emptySearch: 'No teacher matches.',
      emptyIdle: 'No course teachers found yet.',
      showRoleChips: null
    };
  }
  return {
    description: 'Pick someone to message.',
    placeholder: 'Search by name…',
    emptySearch: 'No matches.',
    emptyIdle: 'No people found yet.',
    showRoleChips: null
  };
}
