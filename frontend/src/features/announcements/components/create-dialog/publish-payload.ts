import type { AnnouncementTargetRow, CreateAnnouncementDTO } from '../../api/types';
import type { ImageFile } from './types';

type Primary = {
  facultyId?: number;
  departmentId?: number;
  batchId?: number;
  sectionId?: number;
};

export function buildPublishFormData(args: {
  title: string;
  plain: string;
  content: string;
  priority: string;
  targetType: string;
  targetRoles: string[];
  primary: Primary;
  targets: AnnouncementTargetRow[];
  expiresAtIso: string | null;
  deadlineAtIso: string | null;
  publishNowIso: string;
  notifySms: boolean;
  images: ImageFile[];
}): FormData {
  const payload = new FormData();
  payload.append('title', args.title.trim());
  payload.append('content', args.plain);
  payload.append('bodyHtml', args.content);
  payload.append('bodyMarkdown', args.plain);
  payload.append('priority', args.priority);
  payload.append('targetType', args.targetType);
  args.targetRoles.forEach((role) => payload.append('targetRoles', role));
  if (args.primary.facultyId) payload.append('facultyId', String(args.primary.facultyId));
  if (args.primary.departmentId) payload.append('departmentId', String(args.primary.departmentId));
  if (args.primary.batchId) payload.append('batchId', String(args.primary.batchId));
  if (args.primary.sectionId) payload.append('sectionId', String(args.primary.sectionId));
  if (args.targets.length > 1) payload.append('targets', JSON.stringify(args.targets));
  if (args.expiresAtIso) payload.append('expiresAt', args.expiresAtIso);
  if (args.deadlineAtIso) payload.append('deadlineAt', args.deadlineAtIso);
  payload.append('status', 'PUBLISHED');
  payload.append('publishedAt', args.publishNowIso);
  if (args.notifySms) payload.append('notifySms', 'true');
  args.images.forEach((img) => {
    if (img.file) payload.append('images', img.file);
  });
  args.images.forEach((img) => {
    if (img.file) payload.append('imageAltTexts', img.altText ?? '');
  });
  return payload;
}

export function buildPublishDto(args: {
  title: string;
  plain: string;
  content: string;
  priority: CreateAnnouncementDTO['priority'];
  targetType: CreateAnnouncementDTO['targetType'];
  targetRoles: string[];
  primary: Primary;
  targets: AnnouncementTargetRow[];
  expiresAtIso: string | null;
  deadlineAtIso: string | null;
  publishNowIso: string;
}): CreateAnnouncementDTO {
  return {
    title: args.title.trim(),
    content: args.plain,
    bodyHtml: args.content,
    bodyMarkdown: args.plain,
    priority: args.priority,
    targetType: args.targetType,
    targetRoles: args.targetRoles,
    expiresAt: args.expiresAtIso,
    deadlineAt: args.deadlineAtIso,
    ...args.primary,
    ...(args.targets.length > 1 ? { targets: args.targets } : {}),
    status: 'PUBLISHED',
    publishedAt: args.publishNowIso,
  };
}
