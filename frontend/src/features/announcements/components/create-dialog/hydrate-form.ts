import type { Announcement, AnnouncementPriority, AnnouncementTargetType } from '../../api/types';
import type { ActiveDaysPreset, ImageFile } from './types';
import {
  audienceFlagsFromRoles,
  attachmentsToHydratedImages,
  imageUrlsToHydratedImages,
  inferResumeStep,
  toDatetimeLocalValue,
} from './utils';

export type HydratedForm = {
  step: 1 | 2 | 3;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  targetType: AnnouncementTargetType;
  includeStudents: boolean;
  includeTeachers: boolean;
  activeDaysPreset: ActiveDaysPreset;
  expiresAtCustom: string;
  deadlineAtLocal: string;
  selectedDepartments: string[];
  selectedBatches: string[];
  selectedSections: string[];
  images: ImageFile[];
};

export function hydrateFromAnnouncement(
  announcement: Announcement,
  isDean: boolean,
): HydratedForm {
  const isDraft = String(announcement.status ?? '').toUpperCase() === 'DRAFT';
  const htmlBody = announcement.bodyHtml?.trim();
  const aud = audienceFlagsFromRoles(announcement.targetRoles);
  const t = announcement.targeting;
  const targetsByScope = (scope: 'DEPARTMENT' | 'BATCH' | 'SECTION') =>
    (announcement.targets ?? [])
      .filter((row) => row.scopeType === scope)
      .map((row) => String(row.scopeId));
  const dedupe = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));
  const fromAttachments = attachmentsToHydratedImages(announcement.attachments);
  const hydratedImages =
    fromAttachments.length > 0
      ? fromAttachments
      : imageUrlsToHydratedImages(announcement.imageUrls);

  return {
    step: isDraft ? inferResumeStep(announcement) : 1,
    title: announcement.title ?? '',
    content:
      htmlBody && htmlBody.length > 0
        ? announcement.bodyHtml!
        : (announcement.content ?? ''),
    priority: (announcement.priority ?? 'normal') as AnnouncementPriority,
    targetType: (announcement.targetType ??
      (isDean ? 'DEPARTMENT' : 'ALL')) as AnnouncementTargetType,
    includeStudents: aud.students,
    includeTeachers: aud.teachers,
    activeDaysPreset: 'off',
    expiresAtCustom: toDatetimeLocalValue(announcement.expiresAt),
    deadlineAtLocal: toDatetimeLocalValue(announcement.deadlineAt),
    selectedDepartments: dedupe([
      t?.departmentId ? String(t.departmentId) : '',
      ...targetsByScope('DEPARTMENT'),
    ]),
    selectedBatches: dedupe([
      t?.batchId ? String(t.batchId) : '',
      ...targetsByScope('BATCH'),
    ]),
    selectedSections: dedupe([
      t?.sectionId ? String(t.sectionId) : '',
      ...targetsByScope('SECTION'),
    ]),
    images: hydratedImages,
  };
}
