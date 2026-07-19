import type { AnnouncementTargetRow, AnnouncementTargetType } from '../../api/types';
import type { ActiveDaysPreset, CreateAnnouncementDTO, ImageFile } from './types';
import { computeExpiresIsoFromPreset, htmlToPlain, targetRolesFromFlags } from './utils';

export function buildTargetingPayload(args: {
  targetType: AnnouncementTargetType;
  effectiveDeanFacultyId: number;
  departmentIdsNum: number[];
  batchIdsNum: number[];
  sectionIdsNum: number[];
}) {
  const { targetType, effectiveDeanFacultyId, departmentIdsNum, batchIdsNum, sectionIdsNum } =
    args;
  const primary: {
    facultyId?: number;
    departmentId?: number;
    batchId?: number;
    sectionId?: number;
  } = {};
  const targets: AnnouncementTargetRow[] = [];

  if (targetType === 'FACULTY' && effectiveDeanFacultyId) {
    primary.facultyId = effectiveDeanFacultyId;
  } else if (targetType === 'DEPARTMENT' && departmentIdsNum.length) {
    primary.departmentId = departmentIdsNum[0];
    departmentIdsNum.forEach((id) => targets.push({ scopeType: 'DEPARTMENT', scopeId: id }));
  } else if (targetType === 'BATCH' && batchIdsNum.length) {
    primary.batchId = batchIdsNum[0];
    batchIdsNum.forEach((id) => targets.push({ scopeType: 'BATCH', scopeId: id }));
  } else if (targetType === 'SECTION' && sectionIdsNum.length) {
    primary.sectionId = sectionIdsNum[0];
    sectionIdsNum.forEach((id) => targets.push({ scopeType: 'SECTION', scopeId: id }));
  }
  return { primary, targets };
}

type ScheduleArgs = {
  expiresAtCustom: string;
  activeDaysPreset: ActiveDaysPreset;
  deadlineAtLocal: string;
};

export function resolveScheduleIso({
  expiresAtCustom,
  activeDaysPreset,
  deadlineAtLocal,
}: ScheduleArgs) {
  let expiresAtIso: string | null = null;
  if (expiresAtCustom.trim()) {
    const d = new Date(expiresAtCustom);
    expiresAtIso = Number.isNaN(d.getTime()) ? null : d.toISOString();
  } else if (activeDaysPreset !== 'off') {
    expiresAtIso = computeExpiresIsoFromPreset(activeDaysPreset);
  }
  let deadlineAtIso: string | null = null;
  if (deadlineAtLocal.trim()) {
    const d = new Date(deadlineAtLocal);
    deadlineAtIso = Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return { expiresAtIso, deadlineAtIso };
}

type DraftCore = {
  title: string;
  content: string;
  priority: CreateAnnouncementDTO['priority'];
  targetType: AnnouncementTargetType;
  includeStudents: boolean;
  includeTeachers: boolean;
  primary: ReturnType<typeof buildTargetingPayload>['primary'];
  targets: AnnouncementTargetRow[];
} & ScheduleArgs;

export function buildDraftJsonPayload(args: DraftCore): CreateAnnouncementDTO {
  const plain = htmlToPlain(args.content);
  const targetRoles = targetRolesFromFlags(args.includeStudents, args.includeTeachers);
  const { expiresAtIso, deadlineAtIso } = resolveScheduleIso(args);
  return {
    title: args.title.trim(),
    content: plain,
    bodyHtml: args.content,
    bodyMarkdown: plain,
    priority: args.priority,
    targetType: args.targetType,
    targetRoles,
    status: 'DRAFT',
    ...args.primary,
    ...(args.targets.length > 1 ? { targets: args.targets } : {}),
    ...(expiresAtIso ? { expiresAt: expiresAtIso } : {}),
    ...(deadlineAtIso ? { deadlineAt: deadlineAtIso } : {}),
  };
}

export function buildDraftFormData(args: DraftCore & { images: ImageFile[] }): FormData {
  const dto = buildDraftJsonPayload(args);
  const payload = new FormData();
  payload.append('title', dto.title);
  payload.append('content', dto.content);
  payload.append('bodyHtml', dto.bodyHtml ?? args.content);
  payload.append('bodyMarkdown', dto.bodyMarkdown ?? dto.content);
  payload.append('priority', String(dto.priority));
  payload.append('targetType', String(dto.targetType));
  payload.append('status', 'DRAFT');
  (dto.targetRoles ?? []).forEach((role) => payload.append('targetRoles', role));
  if (dto.facultyId) payload.append('facultyId', String(dto.facultyId));
  if (dto.departmentId) payload.append('departmentId', String(dto.departmentId));
  if (dto.batchId) payload.append('batchId', String(dto.batchId));
  if (dto.sectionId) payload.append('sectionId', String(dto.sectionId));
  if (dto.targets && dto.targets.length > 1) {
    payload.append('targets', JSON.stringify(dto.targets));
  }
  if (dto.expiresAt) payload.append('expiresAt', dto.expiresAt);
  if (dto.deadlineAt) payload.append('deadlineAt', dto.deadlineAt);
  args.images.forEach((img) => {
    if (img.file) payload.append('images', img.file);
  });
  args.images.forEach((img) => {
    if (img.file) payload.append('imageAltTexts', img.altText ?? '');
  });
  return payload;
}
