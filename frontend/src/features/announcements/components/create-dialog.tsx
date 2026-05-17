'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CreateAnnouncementDTO,
  AnnouncementPriority,
  AnnouncementTargetType,
  AnnouncementTargetRow,
  type Announcement,
  type Attachment
} from '../api/types';
import { ImagePicker } from './image-picker';
import { Icons } from '@/components/icons';
import { useAuthStore } from '@/lib/auth-store';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@/lib/async-query';
import { apiClient } from '@/lib/api-client';
import { createAnnouncement, deleteAnnouncement, updateAnnouncement } from '../api/service';
import { AnnouncementRichEditor, computeReadability } from './announcement-rich-editor';
import { previewAnnouncementRecipients } from '../api/service';
import { ChipPicker } from './chip-picker';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

function htmlToPlain(html: string) {
  if (typeof document === 'undefined') return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const d = document.createElement('div');
  d.innerHTML = html;
  return (d.textContent || '').replace(/\s+/g, ' ').trim();
}

function normalizeAudienceRole(role: string): string {
  const u = String(role).toUpperCase();
  return u === 'LECTURER' ? 'TEACHER' : u;
}

/** Default both on; maps to API `targetRoles` (LECTURER = teachers). */
function audienceFlagsFromRoles(roles: string[] | undefined | null): { students: boolean; teachers: boolean } {
  const list = (roles ?? []).map(normalizeAudienceRole);
  const hasStudent = list.includes('STUDENT');
  const hasTeacher = list.includes('TEACHER');
  if (!hasStudent && !hasTeacher) return { students: true, teachers: true };
  return { students: hasStudent, teachers: hasTeacher };
}

function targetRolesFromFlags(students: boolean, teachers: boolean): string[] {
  const out: string[] = [];
  if (students) out.push('STUDENT');
  if (teachers) out.push('LECTURER');
  return out;
}

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type ActiveDaysPreset = 'off' | '1' | '3' | '5' | '7';

/** Anchor for N-day presets: scheduled publish time when set, otherwise "now". */
function resolvePinPresetAnchor(scheduleForLater: boolean, publishedAtLocal: string): Date | undefined {
  if (!scheduleForLater || !publishedAtLocal.trim()) return undefined;
  const d = new Date(publishedAtLocal);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function computeExpiresIsoFromPreset(preset: ActiveDaysPreset, anchor?: Date): string | null {
  if (preset === 'off') return null;
  const days = Number(preset);
  const base =
    anchor && !Number.isNaN(anchor.getTime()) ? new Date(anchor.getTime()) : new Date();
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function resolvePublicAssetUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  const origin = api.replace(/\/api\/?$/, '');
  return url.startsWith('/') ? `${origin}${url}` : `${origin}/${url}`;
}

function attachmentsToHydratedImages(attachments: Attachment[] | undefined): ImageFile[] {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .filter((a) => String(a.fileType).toLowerCase() === 'image' && (a.fileUrl || a.thumbnailUrl))
    .map((a) => ({
      id: `server-${a.id}`,
      preview: resolvePublicAssetUrl(String(a.thumbnailUrl || a.fileUrl || '')),
      altText: a.altText ?? undefined
    }));
}

function imageUrlsToHydratedImages(urls: string[] | undefined): ImageFile[] {
  if (!Array.isArray(urls)) return [];
  return urls
    .filter((u) => typeof u === 'string' && u.trim().length > 0)
    .map((u, i) => ({
      id: `url-${i}-${u.slice(0, 24)}`,
      preview: resolvePublicAssetUrl(u.trim())
    }));
}

function inferResumeStep(announcement: Announcement): 1 | 2 {
  const titleOk = Boolean(announcement.title?.trim());
  const plainFromHtml = htmlToPlain(announcement.bodyHtml ?? '');
  const bodyOk = Boolean(plainFromHtml.trim() || announcement.content?.trim());
  if (!titleOk || !bodyOk) return 1;
  const tt = announcement.targetType;
  if (!tt) return 1;
  if (tt === 'ALL' || tt === 'FACULTY') return 2;
  const t = announcement.targeting;
  const deptFromTargets = (announcement.targets ?? [])
    .filter((r) => r.scopeType === 'DEPARTMENT')
    .map((r) => String(r.scopeId));
  const deptIds = new Set([...deptFromTargets, ...(t?.departmentId != null ? [String(t.departmentId)] : [])]);
  if ((tt === 'DEPARTMENT' || tt === 'BATCH' || tt === 'SECTION') && deptIds.size === 0) return 1;
  if (tt === 'BATCH' || tt === 'SECTION') {
    const hasBatch =
      (announcement.targets ?? []).some((r) => r.scopeType === 'BATCH') || t?.batchId != null;
    if (!hasBatch) return 1;
  }
  if (tt === 'SECTION') {
    const hasSec =
      (announcement.targets ?? []).some((r) => r.scopeType === 'SECTION') || t?.sectionId != null;
    if (!hasSec) return 1;
  }
  return 2;
}

interface ImageFile {
  id: string;
  file?: File;
  preview: string;
  altText?: string;
}

interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateAnnouncementDTO | FormData) => Promise<void>;
  editingAnnouncement?: Announcement | null;
}

type DeanBatchLite = {
  id: number | string;
  name: string;
  program?: {
    department?: { id: number | string; name: string };
    departmentId?: number | string;
  };
};

export function CreateDialog({
  open,
  onOpenChange,
  onSubmit,
  editingAnnouncement = null
}: CreateDialogProps) {
  const { user } = useAuthStore();
  const isDean = user?.role === 'DEAN';

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [stepLive, setStepLive] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetType, setTargetType] = useState<AnnouncementTargetType>(
    isDean ? 'DEPARTMENT' : 'ALL'
  );
  // Multi-target selections — one announcement can hit several departments,
  // batches, or sections at once via the AnnouncementTarget[] table.
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);

  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [includeStudents, setIncludeStudents] = useState(true);
  const [includeTeachers, setIncludeTeachers] = useState(true);
  const [activeDaysPreset, setActiveDaysPreset] = useState<ActiveDaysPreset>('off');
  const [expiresAtCustom, setExpiresAtCustom] = useState('');
  const [deadlineAtLocal, setDeadlineAtLocal] = useState('');
  const [notifySms, setNotifySms] = useState(false);
  const [scheduleForLater, setScheduleForLater] = useState(false);
  const [publishedAtLocal, setPublishedAtLocal] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<ImageFile[]>([]);
  const isEditMode = Boolean(editingAnnouncement);
  const queryClient = useQueryClient();
  const autosaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composerRemoteIdRef = useRef<number | null>(null);
  const deanFacultyId = Number((user as any)?.scope?.facultyId ?? (user as any)?.facultyId ?? 0);
  // Sections are scoped per-batch; for multi-batch announcements we union the
  // section list of every selected batch via parallel fetches.
  const selectedBatchesKey = selectedBatches.slice().sort().join(',');
  const { data: batchesPayload } = useQuery({
    queryKey: ['announcements', 'batches'],
    queryFn: () =>
      apiClient<any[] | { batches?: any[]; results?: any[]; data?: any[] }>('/batches'),
    enabled: open
  });
  const { data: sectionsPayload } = useQuery({
    queryKey: ['announcements', 'sections', selectedBatchesKey],
    queryFn: async () => {
      const ids = selectedBatchesKey ? selectedBatchesKey.split(',') : [];
      if (!ids.length) return [];
      const results = await Promise.all(
        ids.map((id) =>
          apiClient<any[] | { sections?: any[]; results?: any[]; data?: any[] }>(
            `/batch-sections?batchId=${id}`
          )
        )
      );
      return results.flatMap((raw: any) =>
        Array.isArray(raw) ? raw : (raw?.sections ?? raw?.results ?? raw?.data ?? [])
      );
    },
    enabled: open && Boolean(selectedBatchesKey)
  });
  const { data: departmentsPayload } = useQuery({
    queryKey: ['announcements', 'dean', 'departments'],
    queryFn: () => apiClient<any[] | { results?: any[]; data?: any[] }>('/departments'),
    enabled: open
  });
  const { data: meVisibilityPayload } = useQuery({
    queryKey: ['announcements', 'me-visibility', 'create-dialog'],
    queryFn: () =>
      apiClient<{ deanPrimaryFacultyId: number | null }>('/announcements/me-visibility'),
    enabled: isDean && open
  });

  const handleImagesChange = useCallback((newImages: ImageFile[]) => {
    setImages(newImages);
  }, []);

  useEffect(() => {
    const labels = { 1: 'Compose', 2: 'Audience', 3: 'Review' } as const;
    setStepLive(`Step ${step} of 3: ${labels[step]}`);
  }, [step]);

  const minPublishAtLocal = useMemo(() => {
    const d = new Date(Date.now() + 3 * 60 * 1000);
    d.setSeconds(0, 0);
    return toDatetimeLocalValue(d.toISOString());
  }, [open]);

  const deanBatchesRaw: any = batchesPayload as any;
  const deanBatches: DeanBatchLite[] = Array.isArray(deanBatchesRaw)
    ? deanBatchesRaw
    : (deanBatchesRaw?.batches ?? deanBatchesRaw?.results ?? deanBatchesRaw?.data ?? []);
  const allDepartmentsRaw: any = departmentsPayload as any;
  const allDepartments = Array.isArray(allDepartmentsRaw)
    ? allDepartmentsRaw
    : (allDepartmentsRaw?.departments ??
      allDepartmentsRaw?.results ??
      allDepartmentsRaw?.data ??
      []);
  const effectiveDeanFacultyId =
    Number(meVisibilityPayload?.deanPrimaryFacultyId ?? 0) || deanFacultyId || 0;

  const departmentOptions = useMemo(() => {
    // Source of truth: departments API (real names from DB), filtered by dean faculty.
    return allDepartments
      .filter((dep: any) => {
        const depFacultyId = Number(dep?.facultyId ?? dep?.faculty?.id ?? 0);
        if (effectiveDeanFacultyId > 0) return depFacultyId === effectiveDeanFacultyId;
        return true;
      })
      .filter((dep: any) => dep?.id != null)
      .map((dep: any) => ({
        id: String(dep.id),
        name: String(dep?.name ?? `Department ${dep.id}`)
      }));
  }, [allDepartments, effectiveDeanFacultyId]);
  const batchOptions = useMemo(() => {
    if (selectedDepartments.length === 0) return [];
    const depSet = new Set(selectedDepartments);
    return deanBatches
      .filter((b: DeanBatchLite) => {
        const depId = b.program?.department?.id ?? b.program?.departmentId;
        return depId != null && depSet.has(String(depId));
      })
      .map((b: DeanBatchLite) => {
        const depName = b.program?.department?.name ?? '';
        return { id: String(b.id), name: b.name, hint: depName };
      });
  }, [deanBatches, selectedDepartments]);

  const sectionOptions = useMemo(() => {
    const list = Array.isArray(sectionsPayload) ? sectionsPayload : [];
    // Dedupe (a section can never appear under multiple batches, but be defensive).
    const seen = new Set<string>();
    return list
      .map((s: { id: number | string; name: string; batch?: { name?: string } }) => ({
        id: String(s.id),
        name: s.name,
        hint: s.batch?.name
      }))
      .filter((opt) => (seen.has(opt.id) ? false : (seen.add(opt.id), true)));
  }, [sectionsPayload]);

  const departmentIdsNum = useMemo(() => selectedDepartments.map((v) => Number(v)), [selectedDepartments]);
  const batchIdsNum = useMemo(() => selectedBatches.map((v) => Number(v)), [selectedBatches]);
  const sectionIdsNum = useMemo(() => selectedSections.map((v) => Number(v)), [selectedSections]);

  // Audience preview: fires once at least one ID is present at the chosen scope.
  const previewKey = useMemo(() => {
    const facultyId =
      targetType === 'ALL' || targetType === 'FACULTY' ? effectiveDeanFacultyId || undefined : undefined;
    return {
      targetType,
      facultyId,
      departmentIds: targetType === 'DEPARTMENT' ? departmentIdsNum : undefined,
      batchIds: targetType === 'BATCH' ? batchIdsNum : undefined,
      sectionIds: targetType === 'SECTION' ? sectionIdsNum : undefined,
      targetRoles: targetRolesFromFlags(includeStudents, includeTeachers)
    };
  }, [targetType, departmentIdsNum, batchIdsNum, sectionIdsNum, includeStudents, includeTeachers, effectiveDeanFacultyId]);

  const previewReady =
    step >= 2 &&
    open &&
    (() => {
      switch (previewKey.targetType) {
        case 'ALL':
        case 'FACULTY':
          return Boolean(previewKey.facultyId) || !isDean;
        case 'DEPARTMENT':
          return (previewKey.departmentIds?.length ?? 0) > 0;
        case 'BATCH':
          return (previewKey.batchIds?.length ?? 0) > 0;
        case 'SECTION':
          return (previewKey.sectionIds?.length ?? 0) > 0;
        default:
          return false;
      }
    })();

  const { data: audiencePreview, isLoading: previewLoading } = useQuery({
    queryKey: ['announcements', 'preview-recipients', previewKey],
    queryFn: () => previewAnnouncementRecipients(previewKey),
    enabled: previewReady
  });

  const validateStep = (): boolean => {
    const nextErrors: { title?: string; content?: string } = {};
    const plainContent = htmlToPlain(content);
    if (step === 1) {
      if (!title.trim()) nextErrors.title = 'Title is required';
      if (!plainContent) nextErrors.content = 'Content is required';
      if (plainContent.length > 3000) nextErrors.content = 'Message exceeds the 3000 character limit';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const focusId = nextErrors.title ? 'title' : nextErrors.content ? 'content' : null;
      if (focusId) {
        requestAnimationFrame(() => document.getElementById(focusId)?.focus());
      }
      return false;
    }
    if (step === 2) {
      if (
        (targetType === 'DEPARTMENT' || targetType === 'BATCH' || targetType === 'SECTION') &&
        departmentOptions.length === 0
      ) {
        toast.error('No departments available for your faculty yet.');
        return false;
      }
      if (
        (targetType === 'DEPARTMENT' || targetType === 'BATCH' || targetType === 'SECTION') &&
        selectedDepartments.length === 0
      ) {
        toast.error('Please select at least one department');
        return false;
      }
      if ((targetType === 'BATCH' || targetType === 'SECTION') && selectedBatches.length === 0) {
        toast.error('Please select at least one batch');
        return false;
      }
      if (targetType === 'SECTION' && selectedSections.length === 0) {
        toast.error('Please select at least one section');
        return false;
      }
      if (!includeStudents && !includeTeachers) {
        toast.error('Select at least one audience: students and/or teachers');
        return false;
      }
    }
    return true;
  };

  /**
   * Build primary FK + multi-target rows for the chosen targetType.
   *  - The first selected ID becomes the primary FK on Announcement.
   *  - All selected IDs become AnnouncementTarget rows so visibility queries
   *    OR-match every scope, not just the primary one.
   */
  const buildTargetingPayload = useCallback(() => {
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
  }, [targetType, effectiveDeanFacultyId, departmentIdsNum, batchIdsNum, sectionIdsNum]);

  const canPublishAnnouncements = user?.role === 'DEAN' || user?.role === 'SUPER_ADMIN';

  const audienceReadyForDraft = useCallback((): boolean => {
    if (step < 2) return false;
    if (
      (targetType === 'DEPARTMENT' || targetType === 'BATCH' || targetType === 'SECTION') &&
      departmentOptions.length === 0
    ) {
      return false;
    }
    if (
      (targetType === 'DEPARTMENT' || targetType === 'BATCH' || targetType === 'SECTION') &&
      selectedDepartments.length === 0
    ) {
      return false;
    }
    if ((targetType === 'BATCH' || targetType === 'SECTION') && selectedBatches.length === 0) {
      return false;
    }
    if (targetType === 'SECTION' && selectedSections.length === 0) return false;
    if (!includeStudents && !includeTeachers) return false;
    if (targetType === 'ALL' || targetType === 'FACULTY') {
      if (isDean && !effectiveDeanFacultyId) return false;
    }
    return true;
  }, [
    step,
    targetType,
    departmentOptions.length,
    selectedDepartments.length,
    selectedBatches.length,
    selectedSections.length,
    includeStudents,
    includeTeachers,
    isDean,
    effectiveDeanFacultyId
  ]);

  const canPersistDraftCreate = useCallback((): boolean => {
    if (!audienceReadyForDraft()) return false;
    const plain = htmlToPlain(content);
    if (!title.trim() || !plain || plain.length > 3000) return false;
    return true;
  }, [audienceReadyForDraft, title, content]);

  const buildDraftJsonPayload = useCallback((): CreateAnnouncementDTO => {
    const plain = htmlToPlain(content);
    const { primary, targets } = buildTargetingPayload();
    const targetRoles = targetRolesFromFlags(includeStudents, includeTeachers);
    const pinAnchor = resolvePinPresetAnchor(scheduleForLater, publishedAtLocal);
    let expiresAtIso: string | null = null;
    if (expiresAtCustom.trim()) {
      const d = new Date(expiresAtCustom);
      expiresAtIso = Number.isNaN(d.getTime()) ? null : d.toISOString();
    } else if (activeDaysPreset !== 'off') {
      expiresAtIso = computeExpiresIsoFromPreset(activeDaysPreset, pinAnchor);
    }
    let deadlineAtIso: string | null = null;
    if (deadlineAtLocal.trim()) {
      const d = new Date(deadlineAtLocal);
      deadlineAtIso = Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    return {
      title: title.trim(),
      content: plain,
      bodyHtml: content,
      bodyMarkdown: plain,
      priority,
      targetType,
      targetRoles,
      expiresAt: expiresAtIso,
      deadlineAt: deadlineAtIso,
      status: 'DRAFT',
      publishedAt: null,
      ...primary,
      ...(targets.length > 1 ? { targets } : {})
    };
  }, [
    content,
    title,
    buildTargetingPayload,
    includeStudents,
    includeTeachers,
    priority,
    targetType,
    expiresAtCustom,
    activeDaysPreset,
    deadlineAtLocal,
    scheduleForLater,
    publishedAtLocal
  ]);

  const buildDraftFormData = useCallback((): FormData => {
    const plain = htmlToPlain(content);
    const { primary, targets } = buildTargetingPayload();
    const targetRoles = targetRolesFromFlags(includeStudents, includeTeachers);
    const pinAnchor = resolvePinPresetAnchor(scheduleForLater, publishedAtLocal);
    let expiresAtIso: string | null = null;
    if (expiresAtCustom.trim()) {
      const d = new Date(expiresAtCustom);
      expiresAtIso = Number.isNaN(d.getTime()) ? null : d.toISOString();
    } else if (activeDaysPreset !== 'off') {
      expiresAtIso = computeExpiresIsoFromPreset(activeDaysPreset, pinAnchor);
    }
    let deadlineAtIso: string | null = null;
    if (deadlineAtLocal.trim()) {
      const d = new Date(deadlineAtLocal);
      deadlineAtIso = Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    const payload = new FormData();
    payload.append('title', title.trim());
    payload.append('content', plain);
    payload.append('bodyHtml', content);
    payload.append('bodyMarkdown', plain);
    payload.append('priority', priority);
    payload.append('targetType', targetType);
    payload.append('status', 'DRAFT');
    targetRoles.forEach((role) => payload.append('targetRoles', role));
    if (primary.facultyId) payload.append('facultyId', String(primary.facultyId));
    if (primary.departmentId) payload.append('departmentId', String(primary.departmentId));
    if (primary.batchId) payload.append('batchId', String(primary.batchId));
    if (primary.sectionId) payload.append('sectionId', String(primary.sectionId));
    if (targets.length > 1) payload.append('targets', JSON.stringify(targets));
    if (expiresAtIso) payload.append('expiresAt', expiresAtIso);
    if (deadlineAtIso) payload.append('deadlineAt', deadlineAtIso);
    images.forEach((img) => {
      if (img.file) payload.append('images', img.file);
    });
    images.forEach((img) => {
      if (img.file) payload.append('imageAltTexts', img.altText ?? '');
    });
    return payload;
  }, [
    content,
    title,
    buildTargetingPayload,
    includeStudents,
    includeTeachers,
    priority,
    targetType,
    expiresAtCustom,
    activeDaysPreset,
    deadlineAtLocal,
    images,
    scheduleForLater,
    publishedAtLocal
  ]);

  const getRemoteDraftId = useCallback((): number | null => {
    if (isEditMode && editingAnnouncement?.status === 'DRAFT') {
      const id = Number(editingAnnouncement.id);
      return Number.isFinite(id) ? id : null;
    }
    return composerRemoteIdRef.current;
  }, [isEditMode, editingAnnouncement]);

  const persistDraftNow = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!open || !canPublishAnnouncements) return;
      if (isSubmitting) return;
      if (isEditMode && editingAnnouncement?.status !== 'DRAFT') return;

      const showError = (err: unknown) => {
        if (opts?.silent) return;
        const msg = err instanceof Error ? err.message : 'Could not save draft';
        toast.error(msg, {
          description: 'Your changes may not be saved yet.',
          action: {
            label: 'Retry',
            onClick: () => {
              void persistDraftNow({ silent: false });
            }
          }
        });
      };

      try {
        let remoteId = getRemoteDraftId();
        if (!remoteId) {
          if (!canPersistDraftCreate()) return;
          if (images.some((img) => Boolean(img.file))) {
            const fd = buildDraftFormData();
            const created = await createAnnouncement(fd);
            remoteId = Number(created.id);
          } else {
            const created = await createAnnouncement(buildDraftJsonPayload());
            remoteId = Number(created.id);
          }
          if (!Number.isFinite(remoteId)) return;
          composerRemoteIdRef.current = remoteId;
        } else {
          await updateAnnouncement(remoteId, buildDraftJsonPayload());
        }
        void queryClient.invalidateQueries({ queryKey: ['announcements'] });
      } catch (e) {
        showError(e);
        throw e;
      }
    },
    [
      open,
      canPublishAnnouncements,
      isSubmitting,
      isEditMode,
      editingAnnouncement?.id,
      editingAnnouncement?.status,
      getRemoteDraftId,
      canPersistDraftCreate,
      images,
      buildDraftFormData,
      buildDraftJsonPayload,
      queryClient
    ]
  );

  const flushAutosave = useCallback(async () => {
    if (autosaveDebounceRef.current) {
      clearTimeout(autosaveDebounceRef.current);
      autosaveDebounceRef.current = null;
    }
    try {
      await persistDraftNow({ silent: true });
    } catch {
      /* persistDraftNow already toasts when not silent; flush uses silent */
      toast.error('Could not save draft before closing', {
        action: {
          label: 'Retry',
          onClick: () => {
            void persistDraftNow({ silent: false });
          }
        }
      });
    }
  }, [persistDraftNow]);

  const handleSheetOpenChange = useCallback(
    async (next: boolean) => {
      if (!next && open && canPublishAnnouncements) {
        if (isEditMode && editingAnnouncement?.status !== 'DRAFT') {
          onOpenChange(next);
          return;
        }
        await flushAutosave();
      }
      onOpenChange(next);
    },
    [
      open,
      onOpenChange,
      flushAutosave,
      canPublishAnnouncements,
      isEditMode,
      editingAnnouncement?.status
    ]
  );

  useEffect(() => {
    if (!open) {
      if (autosaveDebounceRef.current) {
        clearTimeout(autosaveDebounceRef.current);
        autosaveDebounceRef.current = null;
      }
      composerRemoteIdRef.current = null;
    }
  }, [open]);

  const autosaveActive =
    open &&
    canPublishAnnouncements &&
    (Boolean(isEditMode && editingAnnouncement?.status === 'DRAFT') || !isEditMode);

  useEffect(() => {
    if (!autosaveActive) return;
    if (autosaveDebounceRef.current) clearTimeout(autosaveDebounceRef.current);
    autosaveDebounceRef.current = setTimeout(() => {
      autosaveDebounceRef.current = null;
      void persistDraftNow({ silent: true }).catch(() => {
        toast.error('Autosave failed', {
          action: {
            label: 'Retry',
            onClick: () => void persistDraftNow({ silent: false })
          }
        });
      });
    }, 500);
    return () => {
      if (autosaveDebounceRef.current) {
        clearTimeout(autosaveDebounceRef.current);
        autosaveDebounceRef.current = null;
      }
    };
  }, [
    autosaveActive,
    title,
    content,
    priority,
    targetType,
    selectedDepartments,
    selectedBatches,
    selectedSections,
    includeStudents,
    includeTeachers,
    expiresAtCustom,
    activeDaysPreset,
    deadlineAtLocal,
    step,
    images,
    persistDraftNow
  ]);

  const handleSubmit = async () => {
    setFormError(null);
    if (!validateStep()) return;

    if (autosaveDebounceRef.current) {
      clearTimeout(autosaveDebounceRef.current);
      autosaveDebounceRef.current = null;
    }

    setIsSubmitting(true);
    try {
      if (scheduleForLater) {
        if (!publishedAtLocal.trim()) {
          toast.error('Choose a date and time to schedule this announcement');
          setIsSubmitting(false);
          return;
        }
        const t = new Date(publishedAtLocal).getTime();
        if (!Number.isFinite(t) || t < Date.now() + 120_000) {
          toast.error('Publish time must be at least 2 minutes from now');
          setIsSubmitting(false);
          return;
        }
      }
      const plain = htmlToPlain(content);
      const { primary, targets } = buildTargetingPayload();
      const targetRoles = targetRolesFromFlags(includeStudents, includeTeachers);
      const pinAnchor = resolvePinPresetAnchor(scheduleForLater, publishedAtLocal);

      let expiresAtIso: string | null = null;
      if (expiresAtCustom.trim()) {
        const d = new Date(expiresAtCustom);
        expiresAtIso = Number.isNaN(d.getTime()) ? null : d.toISOString();
      } else if (activeDaysPreset !== 'off') {
        expiresAtIso = computeExpiresIsoFromPreset(activeDaysPreset, pinAnchor);
      }

      let deadlineAtIso: string | null = null;
      if (deadlineAtLocal.trim()) {
        const d = new Date(deadlineAtLocal);
        deadlineAtIso = Number.isNaN(d.getTime()) ? null : d.toISOString();
      }

      if (isEditMode) {
        const dto: CreateAnnouncementDTO = {
          title: title.trim(),
          content: plain,
          bodyHtml: content,
          bodyMarkdown: plain,
          priority,
          targetType,
          targetRoles,
          expiresAt: expiresAtIso,
          deadlineAt: deadlineAtIso,
          ...primary,
          ...(targets.length > 1 ? { targets } : {})
        };
        if (isEditMode && editingAnnouncement?.status === 'SCHEDULED' && !scheduleForLater) {
          dto.status = 'DRAFT';
          dto.publishedAt = null;
        } else if (scheduleForLater && publishedAtLocal.trim()) {
          dto.publishedAt = new Date(publishedAtLocal).toISOString();
        }
        await onSubmit(dto);
      } else {
        const cid = composerRemoteIdRef.current;
        const needsMultipart = images.some((img) => Boolean(img.file)) || notifySms;
        if (cid && !needsMultipart) {
          const publishDto: CreateAnnouncementDTO = {
            title: title.trim(),
            content: plain,
            bodyHtml: content,
            bodyMarkdown: plain,
            priority,
            targetType,
            targetRoles,
            expiresAt: expiresAtIso,
            deadlineAt: deadlineAtIso,
            ...primary,
            ...(targets.length > 1 ? { targets } : {})
          };
          if (scheduleForLater && publishedAtLocal.trim()) {
            publishDto.status = 'SCHEDULED';
            publishDto.publishedAt = new Date(publishedAtLocal).toISOString();
          } else {
            publishDto.status = 'PUBLISHED';
          }
          await updateAnnouncement(cid, publishDto);
          void queryClient.invalidateQueries({ queryKey: ['announcements'] });
        } else {
          if (cid && needsMultipart) {
            await deleteAnnouncement(cid);
            composerRemoteIdRef.current = null;
          }
          const payload = new FormData();
          payload.append('title', title.trim());
          payload.append('content', plain);
          payload.append('bodyHtml', content);
          payload.append('bodyMarkdown', plain);
          payload.append('priority', priority);
          payload.append('targetType', targetType);
          targetRoles.forEach((role) => payload.append('targetRoles', role));

          if (primary.facultyId) payload.append('facultyId', String(primary.facultyId));
          if (primary.departmentId) payload.append('departmentId', String(primary.departmentId));
          if (primary.batchId) payload.append('batchId', String(primary.batchId));
          if (primary.sectionId) payload.append('sectionId', String(primary.sectionId));
          if (targets.length > 1) payload.append('targets', JSON.stringify(targets));
          if (expiresAtIso) payload.append('expiresAt', expiresAtIso);
          if (deadlineAtIso) payload.append('deadlineAt', deadlineAtIso);
          if (scheduleForLater && publishedAtLocal.trim()) {
            payload.append('publishedAt', new Date(publishedAtLocal).toISOString());
          }
          if (notifySms) payload.append('notifySms', 'true');

          images.forEach((img) => {
            if (img.file) payload.append('images', img.file);
          });
          // Parallel array — backend reads `imageAltTexts[]` and persists onto AnnouncementAttachment.altText.
          images.forEach((img) => {
            if (img.file) payload.append('imageAltTexts', img.altText ?? '');
          });
          await onSubmit(payload);
        }
      }

      toast.success(
        isEditMode ? 'Announcement updated successfully!' : 'Announcement posted successfully!'
      );
      resetForm();
      onOpenChange(false);
    } catch {
      setFormError('Failed to post announcement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setTitle('');
    setContent('');
    setTargetType(isDean ? 'DEPARTMENT' : 'ALL');
    setSelectedDepartments([]);
    setSelectedBatches([]);
    setSelectedSections([]);
    setPriority('normal');
    setIncludeStudents(true);
    setIncludeTeachers(true);
    setActiveDaysPreset('off');
    setExpiresAtCustom('');
    setDeadlineAtLocal('');
    setNotifySms(false);
    setScheduleForLater(false);
    setPublishedAtLocal('');
    setFormError(null);
    setErrors({});
    images.forEach((img) => {
      if (img.preview.startsWith('blob:')) URL.revokeObjectURL(img.preview);
    });
    setImages([]);
    if (autosaveDebounceRef.current) {
      clearTimeout(autosaveDebounceRef.current);
      autosaveDebounceRef.current = null;
    }
    composerRemoteIdRef.current = null;
  };

  React.useEffect(() => {
    if (!open) {
      // Delay reset to allow animation to complete
      const timer = setTimeout(resetForm, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open || !editingAnnouncement) return;
    const isDraft = String(editingAnnouncement.status ?? '').toUpperCase() === 'DRAFT';
    setStep(isDraft ? inferResumeStep(editingAnnouncement) : 1);
    setTitle(editingAnnouncement.title ?? '');
    const htmlBody = editingAnnouncement.bodyHtml?.trim();
    setContent(htmlBody && htmlBody.length > 0 ? editingAnnouncement.bodyHtml! : (editingAnnouncement.content ?? ''));
    setPriority((editingAnnouncement.priority ?? 'normal') as AnnouncementPriority);
    setTargetType(
      (editingAnnouncement.targetType ?? (isDean ? 'DEPARTMENT' : 'ALL')) as AnnouncementTargetType
    );
    const aud = audienceFlagsFromRoles(editingAnnouncement.targetRoles);
    setIncludeStudents(aud.students);
    setIncludeTeachers(aud.teachers);
    setActiveDaysPreset('off');
    setExpiresAtCustom(toDatetimeLocalValue(editingAnnouncement.expiresAt));
    setDeadlineAtLocal(toDatetimeLocalValue(editingAnnouncement.deadlineAt));
    setNotifySms(false);
    const pubAt = editingAnnouncement.publishedAt;
    const isSched =
      editingAnnouncement.status === 'SCHEDULED' &&
      Boolean(pubAt) &&
      !Number.isNaN(new Date(String(pubAt)).getTime()) &&
      new Date(String(pubAt)).getTime() > Date.now();
    setScheduleForLater(Boolean(isSched));
    setPublishedAtLocal(isSched ? toDatetimeLocalValue(pubAt) : '');

    // Hydrate multi-target arrays. Each level is the union of:
    //   1. the primary FK (if set), and
    //   2. matching scope rows from announcement.targets[].
    const t = editingAnnouncement.targeting;
    const targetsByScope = (scope: 'DEPARTMENT' | 'BATCH' | 'SECTION') =>
      (editingAnnouncement.targets ?? [])
        .filter((row) => row.scopeType === scope)
        .map((row) => String(row.scopeId));
    const dedupe = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

    setSelectedDepartments(
      dedupe([t?.departmentId ? String(t.departmentId) : '', ...targetsByScope('DEPARTMENT')])
    );
    setSelectedBatches(
      dedupe([t?.batchId ? String(t.batchId) : '', ...targetsByScope('BATCH')])
    );
    setSelectedSections(
      dedupe([t?.sectionId ? String(t.sectionId) : '', ...targetsByScope('SECTION')])
    );
    const fromAttachments = attachmentsToHydratedImages(editingAnnouncement.attachments);
    const hydrated =
      fromAttachments.length > 0
        ? fromAttachments
        : imageUrlsToHydratedImages(editingAnnouncement.imageUrls);
    setImages(hydrated);
    setFormError(null);
    setErrors({});
  }, [open, editingAnnouncement, isDean]);

  // Reusable styles for the modern 2026 segmented controls.
  const segmentedClass = (active: boolean) =>
    cn(
      'flex-1 min-h-[44px] rounded-lg px-3 py-2 text-xs font-medium transition-all',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
      active
        ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
        : 'text-muted-foreground hover:text-foreground'
    );

  const targetTypeOptions: { value: AnnouncementTargetType; label: string; hint: string }[] = [
    ...((!isDean
      ? [{ value: 'ALL' as AnnouncementTargetType, label: 'Everyone', hint: 'University-wide' }]
      : []) as { value: AnnouncementTargetType; label: string; hint: string }[]),
    { value: 'DEPARTMENT', label: 'Departments', hint: 'Pick one or many' },
    { value: 'BATCH', label: 'Batches', hint: 'Across departments' },
    { value: 'SECTION', label: 'Sections', hint: 'Most specific' }
  ];

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange} modal>
      <SheetContent
        side='right'
        className='flex w-full flex-col border-s border-border bg-background p-0 shadow-2xl sm:max-w-[560px]'
        onOpenAutoFocus={(e) => {
          if (step === 1) {
            e.preventDefault();
            requestAnimationFrame(() => document.getElementById('title')?.focus());
          }
        }}
      >
        <SheetHeader className='border-b border-border/60 bg-gradient-to-b from-background to-muted/30 px-6 pb-4 pr-14 pt-6'>
          <div className='min-w-0'>
            <SheetTitle className='text-xl font-semibold tracking-tight'>
              {isEditMode
                ? String(editingAnnouncement?.status ?? '').toUpperCase() === 'DRAFT'
                  ? 'Edit draft'
                  : 'Edit announcement'
                : 'New announcement'}
            </SheetTitle>
            <SheetDescription className='sr-only'>
              {stepLive}. Multi-step form to compose and publish a campus announcement.
            </SheetDescription>
            <p className='mt-1 text-sm text-muted-foreground' aria-hidden>
              {step === 1
                ? 'Compose the message — text, images, and tone.'
                : step === 2
                  ? 'Choose who should see it.'
                  : 'Review delivery options and publish.'}
            </p>
          </div>
          <div aria-live='polite' aria-atomic='true' className='sr-only'>
            {stepLive}
          </div>
          <ol
            aria-label='Progress'
            className='mt-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground'
          >
            {([1, 2, 3] as const).map((n) => {
              const label = n === 1 ? 'Compose' : n === 2 ? 'Audience' : 'Review';
              const completed = step > n;
              const isClickable = n < step;
              return (
                <li key={n} className='flex flex-1 items-center gap-2'>
                  <button
                    type='button'
                    disabled={!isClickable}
                    onClick={() => {
                      if (isClickable) setStep(n);
                    }}
                    aria-current={step === n ? 'step' : undefined}
                    className={cn(
                      'flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isClickable ? 'cursor-pointer' : 'cursor-default'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-colors',
                        step >= n ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {completed ? <Icons.check className='size-3.5' aria-hidden /> : n}
                    </span>
                    <span className={cn('truncate', step === n && 'text-foreground')}>{label}</span>
                  </button>
                  {n < 3 && <span aria-hidden className='h-px flex-1 bg-border' />}
                </li>
              );
            })}
          </ol>
        </SheetHeader>

        <div className='flex-1 space-y-6 overflow-y-auto px-6 py-5'>
          {formError && (
            <div
              role='alert'
              className='rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive'
            >
              {formError}
            </div>
          )}

          {step === 1 && (
            <>
              <div className='space-y-2'>
                <Label htmlFor='title' className='text-xs font-medium text-foreground'>
                  Title
                </Label>
                <Input
                  id='title'
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                  }}
                  placeholder='Enter announcement title'
                  aria-invalid={!!errors.title}
                  className='h-11 rounded-xl border-input bg-background text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring'
                />
                {errors.title && <p className='text-xs text-destructive'>{errors.title}</p>}
              </div>

              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <Label htmlFor='content' className='text-xs font-medium text-foreground'>
                    Message
                  </Label>
                  <span
                    id='content-counter'
                    aria-live='polite'
                    className={cn(
                      'text-[11px] tabular-nums',
                      htmlToPlain(content).length > 3000
                        ? 'font-semibold text-destructive'
                        : 'text-muted-foreground'
                    )}
                  >
                    {htmlToPlain(content).length} / 3000
                  </span>
                </div>
                <AnnouncementRichEditor
                  id='content'
                  value={content}
                  onChange={(html) => {
                    setContent(html);
                    if (errors.content) setErrors((prev) => ({ ...prev, content: undefined }));
                  }}
                  placeholder='Write your announcement…'
                  aria-invalid={!!errors.content}
                  aria-describedby='content-counter content-readability'
                />
                {(() => {
                  const readability = computeReadability(htmlToPlain(content));
                  if (!readability) return null;
                  const tone =
                    readability.score >= 60
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : readability.score >= 40
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-destructive';
                  return (
                    <p
                      id='content-readability'
                      aria-live='polite'
                      className={cn('flex items-center gap-1.5 text-[11px]', tone)}
                    >
                      <Icons.info className='size-3' aria-hidden />
                      Reading ease {readability.score} · {readability.grade}
                    </p>
                  );
                })()}
                {errors.content && <p className='text-xs text-destructive'>{errors.content}</p>}
              </div>

              <div className='space-y-2'>
                <Label className='text-xs font-medium text-foreground'>Images <span className='font-normal text-muted-foreground'>· optional</span></Label>
                <div className='rounded-2xl border border-dashed border-border bg-muted/30 p-4'>
                  <div className='mb-3 flex items-center gap-2 text-xs text-muted-foreground'>
                    <Icons.photoPlus className='size-4' aria-hidden />
                    Drag and drop, or click to browse
                  </div>
                  <ImagePicker images={images} onImagesChange={handleImagesChange} maxImages={10} />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <div className='space-y-6'>
              {/* Reach: segmented + chip pickers (multi-select) — moved to top so users see scope first */}
              <fieldset className='space-y-3'>
                <legend className='text-xs font-medium text-foreground'>Reach</legend>
                <div
                  role='radiogroup'
                  aria-label='Reach scope'
                  className='grid grid-cols-2 gap-1 rounded-xl border border-input bg-muted/50 p-1 sm:grid-cols-4'
                >
                  {targetTypeOptions.map((opt) => {
                    const active = targetType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type='button'
                        role='radio'
                        aria-checked={active}
                        onClick={() => {
                          setTargetType(opt.value);
                          // Cascade clear when scope tightens.
                          if (opt.value === 'ALL' || opt.value === 'FACULTY') {
                            setSelectedDepartments([]);
                            setSelectedBatches([]);
                            setSelectedSections([]);
                          } else if (opt.value === 'DEPARTMENT') {
                            setSelectedBatches([]);
                            setSelectedSections([]);
                          } else if (opt.value === 'BATCH') {
                            setSelectedSections([]);
                          }
                        }}
                        className={cn(
                          segmentedClass(active),
                          'flex-col items-start gap-0 px-2.5 py-2 text-start'
                        )}
                      >
                        <span className='text-[12px] font-semibold leading-tight'>{opt.label}</span>
                        <span className='text-[10px] font-normal text-muted-foreground'>{opt.hint}</span>
                      </button>
                    );
                  })}
                </div>

                {(targetType === 'DEPARTMENT' ||
                  targetType === 'BATCH' ||
                  targetType === 'SECTION') && (
                  <ChipPicker
                    label='Departments'
                    placeholder={
                      departmentOptions.length === 0
                        ? 'No departments in your faculty yet'
                        : 'Pick one or more departments'
                    }
                    options={departmentOptions}
                    value={selectedDepartments}
                    onChange={(ids) => {
                      setSelectedDepartments(ids);
                      // Drop batches/sections that no longer have a parent department.
                      const allowed = new Set(ids);
                      setSelectedBatches((prev) => {
                        const next = prev.filter((b) => {
                          const batch = deanBatches.find((db) => String(db.id) === b);
                          const dep = batch?.program?.department?.id ?? batch?.program?.departmentId;
                          return dep != null && allowed.has(String(dep));
                        });
                        if (next.length !== prev.length) setSelectedSections([]);
                        return next;
                      });
                    }}
                  />
                )}

                {(targetType === 'BATCH' || targetType === 'SECTION') && (
                  <ChipPicker
                    label='Batches'
                    placeholder={
                      selectedDepartments.length === 0
                        ? 'Pick a department first'
                        : 'Pick one or more batches'
                    }
                    emptyMessage='No batches in the chosen departments'
                    options={batchOptions}
                    value={selectedBatches}
                    onChange={(ids) => {
                      setSelectedBatches(ids);
                      // Drop sections whose batch is no longer selected.
                      const allowed = new Set(ids);
                      setSelectedSections((prev) =>
                        prev.filter((s) => {
                          const opt = sectionOptions.find((so) => so.id === s);
                          // We only have the section name, not its parent batch ID — so
                          // re-fetch will repopulate; conservatively keep until refetch clears.
                          return Boolean(opt) && allowed.size > 0;
                        })
                      );
                    }}
                  />
                )}

                {targetType === 'SECTION' && (
                  <ChipPicker
                    label='Sections'
                    placeholder={
                      selectedBatches.length === 0
                        ? 'Pick a batch first'
                        : 'Pick one or more sections'
                    }
                    emptyMessage='No sections in the chosen batches'
                    options={sectionOptions}
                    value={selectedSections}
                    onChange={setSelectedSections}
                  />
                )}
              </fieldset>

              {/* Audience roles — both checked by default; uncheck to narrow */}
              <fieldset className='space-y-3'>
                <legend className='text-xs font-medium text-foreground'>Visible to</legend>
                <p className='text-[11px] text-muted-foreground'>
                  By default everyone in your reach sees the post. Uncheck a group to exclude them.
                </p>
                <div className='flex flex-col gap-3 rounded-xl border border-input bg-muted/30 px-4 py-3'>
                  <label className='flex cursor-pointer items-center gap-3 text-sm'>
                    <Checkbox
                      checked={includeStudents}
                      onCheckedChange={(v) => setIncludeStudents(v === true)}
                      aria-label='Include students'
                    />
                    <span>Students</span>
                  </label>
                  <label className='flex cursor-pointer items-center gap-3 text-sm'>
                    <Checkbox
                      checked={includeTeachers}
                      onCheckedChange={(v) => setIncludeTeachers(v === true)}
                      aria-label='Include teachers'
                    />
                    <span>Teachers</span>
                  </label>
                </div>
              </fieldset>

              {/* Audience preview — sticky bottom anchor */}
              <section
                aria-labelledby='audience-preview-heading'
                className='rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-background to-background p-4'
              >
                <div className='flex items-start gap-3'>
                  <div className='flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
                    <Icons.user className='size-4' aria-hidden />
                  </div>
                  <div className='min-w-0 flex-1'>
                    <h3
                      id='audience-preview-heading'
                      className='text-sm font-semibold text-foreground'
                    >
                      Who will see this?
                    </h3>
                    <div aria-live='polite' className='mt-1 text-xs text-muted-foreground'>
                      {!previewReady && (
                        <p>Choose a reach above to preview the audience.</p>
                      )}
                      {previewReady && previewLoading && <p>Calculating reach…</p>}
                      {previewReady && !previewLoading && audiencePreview && (
                        <>
                          <p className='text-foreground'>
                            <strong className='text-2xl font-semibold tabular-nums tracking-tight'>
                              {audiencePreview.count}
                            </strong>{' '}
                            <span className='text-muted-foreground'>
                              recipient{audiencePreview.count === 1 ? '' : 's'}
                              {audiencePreview.shardCount && audiencePreview.shardCount > 1
                                ? ` · ${audiencePreview.shardCount} target${audiencePreview.shardCount === 1 ? '' : 's'}`
                                : ''}
                            </span>
                          </p>
                          {audiencePreview.sample.length > 0 && (
                            <p className='mt-1'>
                              Including {audiencePreview.sample.map((u) => u.name).join(', ')}
                              {audiencePreview.count > audiencePreview.sample.length
                                ? ` and ${audiencePreview.count - audiencePreview.sample.length} more`
                                : ''}
                              .
                            </p>
                          )}
                          {audiencePreview.count === 0 && (
                            <p className='mt-1 text-amber-600 dark:text-amber-400'>
                              No active users match this targeting. Double-check the scope before
                              publishing.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {step === 3 && (
            <div className='space-y-6'>
              {/* Priority — segmented + non-color signifier */}
              <fieldset className='space-y-2'>
                <legend className='text-xs font-medium text-foreground'>Priority</legend>
                <div
                  role='radiogroup'
                  aria-label='Priority'
                  className='flex gap-1 rounded-xl border border-input bg-muted/50 p-1'
                >
                  {([
                    { value: 'normal', label: 'Normal', icon: null },
                    { value: 'important', label: 'Important', icon: Icons.info },
                    { value: 'urgent', label: 'Urgent', icon: Icons.warning }
                  ] as const).map((opt) => {
                    const active = priority === opt.value;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type='button'
                        role='radio'
                        aria-checked={active}
                        onClick={() => setPriority(opt.value)}
                        className={segmentedClass(active)}
                      >
                        <span className='inline-flex items-center justify-center gap-1.5'>
                          {Icon && <Icon className='size-3.5' aria-hidden />}
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className='space-y-2'>
                <legend className='text-xs font-medium text-foreground'>Publish</legend>
                <label className='flex cursor-pointer items-start gap-3 rounded-xl border border-input bg-muted/30 px-4 py-3 text-sm'>
                  <Checkbox
                    checked={scheduleForLater}
                    onCheckedChange={(v) => {
                      setScheduleForLater(v === true);
                      if (v !== true) setPublishedAtLocal('');
                    }}
                    className='mt-0.5'
                    aria-label='Schedule for later'
                  />
                  <span>
                    Schedule for later
                    <span className='mt-1 block text-[11px] font-normal text-muted-foreground'>
                      Recipients will not see this until the publish time. You can manage scheduled posts
                      from the Scheduled tab.
                    </span>
                  </span>
                </label>
                {scheduleForLater && (
                  <div className='space-y-1.5 ps-1'>
                    <Label htmlFor='publish-at-local' className='text-[11px] text-muted-foreground'>
                      Publish date and time
                    </Label>
                    <Input
                      id='publish-at-local'
                      type='datetime-local'
                      min={minPublishAtLocal}
                      value={publishedAtLocal}
                      onChange={(e) => setPublishedAtLocal(e.target.value)}
                      className='rounded-lg'
                    />
                  </div>
                )}
              </fieldset>

              <fieldset className='space-y-2'>
                <legend className='text-xs font-medium text-foreground'>Active days</legend>
                <p className='text-[11px] text-muted-foreground'>
                  Active posts sort to the top for the selected number of days, then return to normal order (they
                  stay visible as regular announcements). Day presets count from the scheduled publish time when
                  you use Schedule for later; otherwise from when you post. Custom end overrides presets.
                </p>
                <div className='flex flex-wrap gap-1 rounded-xl border border-input bg-muted/50 p-1'>
                  {(
                    [
                      { value: 'off' as const, label: 'No limit' },
                      { value: '1' as const, label: '1 day' },
                      { value: '3' as const, label: '3 days' },
                      { value: '5' as const, label: '5 days' },
                      { value: '7' as const, label: '7 days' }
                    ] as const
                  ).map((opt) => {
                    const active = activeDaysPreset === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type='button'
                        onClick={() => {
                          setActiveDaysPreset(opt.value);
                          if (opt.value !== 'off') setExpiresAtCustom('');
                        }}
                        className={segmentedClass(active)}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='expires-custom' className='text-[11px] text-muted-foreground'>
                    Or custom end (overrides preset)
                  </Label>
                  <Input
                    id='expires-custom'
                    type='datetime-local'
                    value={expiresAtCustom}
                    onChange={(e) => {
                      setExpiresAtCustom(e.target.value);
                      if (e.target.value) setActiveDaysPreset('off');
                    }}
                    className='rounded-lg'
                  />
                </div>
              </fieldset>

              <fieldset className='space-y-2'>
                <legend className='text-xs font-medium text-foreground'>Calendar deadline</legend>
                <p className='text-[11px] text-muted-foreground'>
                  Optional. Appears on the dashboard calendar for recipients (e.g. exam submission due).
                </p>
                <Input
                  type='datetime-local'
                  value={deadlineAtLocal}
                  onChange={(e) => setDeadlineAtLocal(e.target.value)}
                  className='rounded-lg'
                  aria-label='Calendar deadline'
                />
              </fieldset>

              {!isEditMode && (
                <fieldset className='space-y-2'>
                  <legend className='text-xs font-medium text-foreground'>SMS</legend>
                  <label className='flex cursor-pointer items-start gap-3 rounded-xl border border-input bg-muted/30 px-4 py-3 text-sm'>
                    <Checkbox
                      checked={notifySms}
                      onCheckedChange={(v) => setNotifySms(v === true)}
                      className='mt-0.5'
                      aria-label='Send SMS notification'
                    />
                    <span>
                      Send SMS alert to recipients who have a phone on file
                      <span className='mt-1 block text-[11px] font-normal text-muted-foreground'>
                        Uses Twilio when TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER are set;
                        otherwise the server logs a demo line only.
                      </span>
                    </span>
                  </label>
                </fieldset>
              )}

              {/* Review summary — last-chance confirmation before publishing */}
              <section
                aria-labelledby='review-summary-heading'
                className='space-y-3 rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-background to-background p-4'
              >
                <div className='flex items-center gap-2'>
                  <div className='flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
                    <Icons.send className='size-4' aria-hidden />
                  </div>
                  <h3 id='review-summary-heading' className='text-sm font-semibold text-foreground'>
                    Review before posting
                  </h3>
                </div>
                <dl className='grid gap-2 text-xs'>
                  <div className='flex items-start justify-between gap-3'>
                    <dt className='text-muted-foreground'>Title</dt>
                    <dd className='max-w-[60%] truncate text-end font-medium text-foreground'>
                      {title.trim() || '—'}
                    </dd>
                  </div>
                  <div className='flex items-start justify-between gap-3'>
                    <dt className='text-muted-foreground'>Message</dt>
                    <dd className='max-w-[60%] text-end text-muted-foreground'>
                      {(() => {
                        const plain = htmlToPlain(content);
                        if (!plain) return '—';
                        return plain.length > 80 ? `${plain.slice(0, 80)}…` : plain;
                      })()}
                    </dd>
                  </div>
                  {images.length > 0 && (
                    <div className='flex items-center justify-between gap-3'>
                      <dt className='text-muted-foreground'>Images</dt>
                      <dd className='font-medium text-foreground'>
                        {images.length} attached
                      </dd>
                    </div>
                  )}
                  <div className='flex items-center justify-between gap-3'>
                    <dt className='text-muted-foreground'>Audience</dt>
                    <dd className='text-end font-medium text-foreground'>
                      {previewLoading
                        ? 'Calculating…'
                        : audiencePreview
                          ? `${audiencePreview.count} recipient${audiencePreview.count === 1 ? '' : 's'}`
                          : '—'}
                      <span className='ms-1 font-normal text-muted-foreground'>
                        ·{' '}
                        {targetType === 'ALL'
                          ? 'Everyone'
                          : targetType === 'FACULTY'
                            ? 'Faculty'
                            : targetType === 'DEPARTMENT'
                              ? `${selectedDepartments.length} dept${selectedDepartments.length === 1 ? '' : 's'}`
                              : targetType === 'BATCH'
                                ? `${selectedBatches.length} batch${selectedBatches.length === 1 ? '' : 'es'}`
                                : `${selectedSections.length} section${selectedSections.length === 1 ? '' : 's'}`}
                      </span>
                    </dd>
                  </div>
                  <div className='flex items-center justify-between gap-3'>
                    <dt className='text-muted-foreground'>Roles</dt>
                    <dd className='font-medium text-foreground'>
                      {[includeStudents && 'Students', includeTeachers && 'Teachers']
                        .filter(Boolean)
                        .join(' + ') || '—'}
                    </dd>
                  </div>
                  <div className='flex items-center justify-between gap-3'>
                    <dt className='text-muted-foreground'>Priority</dt>
                    <dd className='font-medium capitalize text-foreground'>{priority}</dd>
                  </div>
                  {scheduleForLater && publishedAtLocal && (
                    <div className='flex items-center justify-between gap-3'>
                      <dt className='text-muted-foreground'>Publish</dt>
                      <dd className='font-medium text-foreground'>
                        {new Date(publishedAtLocal).toLocaleString()}
                      </dd>
                    </div>
                  )}
                  <div className='flex items-center justify-between gap-3'>
                    <dt className='text-muted-foreground'>Active until</dt>
                    <dd className='font-medium text-foreground'>
                      {(() => {
                        if (expiresAtCustom.trim()) {
                          return new Date(expiresAtCustom).toLocaleString();
                        }
                        if (activeDaysPreset === 'off') return 'No active-days limit';
                        const anchor = resolvePinPresetAnchor(scheduleForLater, publishedAtLocal);
                        const iso = computeExpiresIsoFromPreset(activeDaysPreset, anchor);
                        return iso ? new Date(iso).toLocaleString() : '—';
                      })()}
                    </dd>
                  </div>
                  {deadlineAtLocal && (
                    <div className='flex items-center justify-between gap-3'>
                      <dt className='text-muted-foreground'>Calendar deadline</dt>
                      <dd className='font-medium text-foreground'>
                        {new Date(deadlineAtLocal).toLocaleString()}
                      </dd>
                    </div>
                  )}
                  {!isEditMode && notifySms && (
                    <div className='flex items-center justify-between gap-3'>
                      <dt className='text-muted-foreground'>SMS alert</dt>
                      <dd className='font-medium text-amber-600 dark:text-amber-400'>
                        Will send via Twilio
                      </dd>
                    </div>
                  )}
                </dl>
                {audiencePreview && audiencePreview.count === 0 && (
                  <p
                    role='alert'
                    className='rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400'
                  >
                    No active users match this targeting. Go back to step 2 and widen the reach
                    before publishing.
                  </p>
                )}
              </section>
            </div>
          )}
        </div>

        <SheetFooter className='mt-auto gap-2 border-t border-border bg-background/95 px-6 pb-6 pt-4 backdrop-blur-md'>
          <Button
            variant='outline'
            onClick={() => {
              if (step === 1) onOpenChange(false);
              else setStep((prev) => (prev - 1) as 1 | 2 | 3);
            }}
            className='h-11 min-h-[44px] flex-1 rounded-xl'
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          {step < 3 ? (
            <Button
              onClick={() => {
                if (!validateStep()) return;
                setStep((prev) => (prev + 1) as 1 | 2 | 3);
              }}
              className='h-11 min-h-[44px] flex-1 rounded-xl'
            >
              Continue
              <Icons.chevronRight className='ms-1 size-4' aria-hidden />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !title.trim() || !htmlToPlain(content)}
              className='h-11 min-h-[44px] flex-1 rounded-xl'
            >
              {isSubmitting ? (
                <>
                  <Icons.spinner className='me-2 size-4 animate-spin' aria-hidden />
                  Posting…
                </>
              ) : isEditMode ? (
                'Save changes'
              ) : (
                'Post announcement'
              )}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
