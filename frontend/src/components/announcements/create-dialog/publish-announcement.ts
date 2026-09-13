import type { CreateAnnouncementDTO } from '@/lib/announcements/types';
import type { ImageFile } from './types';
import { htmlToPlain, targetRolesFromFlags } from './utils';
import { resolveScheduleIso } from './build-payload';
import { buildPublishDto, buildPublishFormData } from './publish-payload';

type Targeting = {
  primary: {
    facultyId?: number;
    departmentId?: number;
    batchId?: number;
    sectionId?: number;
  };
  targets: { scopeType: 'DEPARTMENT' | 'BATCH' | 'SECTION' | 'FACULTY'; scopeId: number }[];
};

type Args = {
  title: string;
  content: string;
  priority: CreateAnnouncementDTO['priority'];
  targetType: NonNullable<CreateAnnouncementDTO['targetType']>;
  includeStudents: boolean;
  includeTeachers: boolean;
  expiresAtCustom: string;
  activeDaysPreset: import('./types').ActiveDaysPreset;
  deadlineAtLocal: string;
  notifySms: boolean;
  images: ImageFile[];
  targeting: Targeting;
  isEditMode: boolean;
  remoteDraftId: number | null;
  onSubmit: (data: CreateAnnouncementDTO | FormData) => Promise<void>;
  updateExisting: (id: number, dto: CreateAnnouncementDTO) => Promise<unknown>;
  deleteExisting: (id: number) => Promise<unknown>;
  invalidate: () => void;
};

export async function publishAnnouncement(args: Args): Promise<void> {
  const plain = htmlToPlain(args.content);
  const targetRoles = targetRolesFromFlags(args.includeStudents, args.includeTeachers);
  const publishNowIso = new Date().toISOString();
  const { expiresAtIso, deadlineAtIso } = resolveScheduleIso({
    expiresAtCustom: args.expiresAtCustom,
    activeDaysPreset: args.activeDaysPreset,
    deadlineAtLocal: args.deadlineAtLocal,
  });
  const publishArgs = {
    title: args.title,
    plain,
    content: args.content,
    priority: args.priority ?? 'normal',
    targetType: args.targetType,
    targetRoles,
    primary: args.targeting.primary,
    targets: args.targeting.targets,
    expiresAtIso,
    deadlineAtIso,
    publishNowIso,
  };

  if (args.isEditMode) {
    await args.onSubmit(buildPublishDto(publishArgs));
    return;
  }

  const cid = args.remoteDraftId;
  const needsMultipart =
    args.images.some((img) => Boolean(img.file)) || args.notifySms;
  if (cid && !needsMultipart) {
    await args.updateExisting(cid, buildPublishDto(publishArgs));
    args.invalidate();
    return;
  }
  if (cid && needsMultipart) {
    await args.deleteExisting(cid);
  }
  await args.onSubmit(
    buildPublishFormData({
      ...publishArgs,
      notifySms: args.notifySms,
      images: args.images,
    }),
  );
}
