import { resolvePublicAssetUrl } from '@/lib/resolve-public-asset-url';
import { cn } from '@/lib/utils';
import type { Announcement, Attachment } from '../../api/types';
import type { ActiveDaysPreset, ImageFile } from './types';

export function htmlToPlain(html: string) {
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const d = document.createElement('div');
  d.innerHTML = html;
  return (d.textContent || '').replace(/\s+/g, ' ').trim();
}

function normalizeAudienceRole(role: string): string {
  const u = String(role).toUpperCase();
  return u === 'LECTURER' ? 'TEACHER' : u;
}

export function audienceFlagsFromRoles(
  roles: string[] | undefined | null,
): { students: boolean; teachers: boolean } {
  const list = (roles ?? []).map(normalizeAudienceRole);
  const hasStudent = list.includes('STUDENT');
  const hasTeacher = list.includes('TEACHER');
  if (!hasStudent && !hasTeacher) return { students: true, teachers: true };
  return { students: hasStudent, teachers: hasTeacher };
}

export function targetRolesFromFlags(students: boolean, teachers: boolean): string[] {
  const out: string[] = [];
  if (students) out.push('STUDENT');
  if (teachers) out.push('LECTURER');
  return out;
}

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function computeExpiresIsoFromPreset(
  preset: ActiveDaysPreset,
  anchor?: Date,
): string | null {
  if (preset === 'off') return null;
  const days = Number(preset);
  const base =
    anchor && !Number.isNaN(anchor.getTime()) ? new Date(anchor.getTime()) : new Date();
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export function attachmentsToHydratedImages(
  attachments: Attachment[] | undefined,
): ImageFile[] {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .filter((a) => String(a.fileType).toLowerCase() === 'image' && (a.fileUrl || a.thumbnailUrl))
    .map((a) => ({
      id: `server-${a.id}`,
      preview: resolvePublicAssetUrl(String(a.thumbnailUrl || a.fileUrl || '')) ?? '',
      altText: a.altText ?? undefined,
    }));
}

export function imageUrlsToHydratedImages(urls: string[] | undefined): ImageFile[] {
  if (!Array.isArray(urls)) return [];
  return urls
    .filter((u) => typeof u === 'string' && u.trim().length > 0)
    .map((u, i) => ({
      id: `url-${i}-${u.slice(0, 24)}`,
      preview: resolvePublicAssetUrl(u.trim()) ?? '',
    }));
}

export function inferResumeStep(announcement: Announcement): 1 | 2 {
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
  const deptIds = new Set([
    ...deptFromTargets,
    ...(t?.departmentId != null ? [String(t.departmentId)] : []),
  ]);
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

export function segmentedClass(active: boolean) {
  return cn(
    'flex-1 min-h-[44px] rounded-lg px-3 py-2 text-xs font-medium transition-all',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
    active
      ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
      : 'text-muted-foreground hover:text-foreground',
  );
}
