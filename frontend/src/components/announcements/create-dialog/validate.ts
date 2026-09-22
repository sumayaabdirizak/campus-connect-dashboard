import { toast } from 'sonner';
import type { AnnouncementTargetType } from '@/lib/announcements/types';
import { htmlToPlain } from './utils';

export function validateComposeStep(content: string) {
  const nextErrors: { title?: string; content?: string } = {};
  const plainContent = htmlToPlain(content);
  if (!plainContent) nextErrors.content = 'Content is required';
  if (plainContent.length > 3000) nextErrors.content = 'Message exceeds the 3000 character limit';
  return nextErrors;
}

export function validateAudienceStep(args: {
  targetType: AnnouncementTargetType;
  departmentOptionsLength: number;
  selectedDepartmentsLength: number;
  selectedBatchesLength: number;
  selectedSectionsLength: number;
  includeStudents: boolean;
  includeTeachers: boolean;
}): boolean {
  const {
    targetType,
    departmentOptionsLength,
    selectedDepartmentsLength,
    selectedBatchesLength,
    selectedSectionsLength,
    includeStudents,
    includeTeachers,
  } = args;

  if (
    (targetType === 'DEPARTMENT' || targetType === 'BATCH' || targetType === 'SECTION') &&
    departmentOptionsLength === 0
  ) {
    toast.error('No departments available for your faculty yet.');
    return false;
  }
  if (
    (targetType === 'DEPARTMENT' || targetType === 'BATCH' || targetType === 'SECTION') &&
    selectedDepartmentsLength === 0
  ) {
    toast.error('Please select at least one department');
    return false;
  }
  if ((targetType === 'BATCH' || targetType === 'SECTION') && selectedBatchesLength === 0) {
    toast.error('Please select at least one batch');
    return false;
  }
  if (targetType === 'SECTION' && selectedSectionsLength === 0) {
    toast.error('Please select at least one section');
    return false;
  }
  if (!includeStudents && !includeTeachers) {
    toast.error('Select at least one audience: students and/or teachers');
    return false;
  }
  return true;
}
