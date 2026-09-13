import {
  isDeanRole,
  isStudentRole,
  isTeacherRole,
} from '@shared/roles';

export function newMessageCopyForRole(role: string | undefined) {
  if (isDeanRole(role)) {
    return {
      description: 'Browse faculty people — or search.',
      placeholder: 'Search by name…',
      emptySearch: 'No one matches that search.',
      emptyIdle: 'No teachers or students found yet.',
      showRoleChips: true as const
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
