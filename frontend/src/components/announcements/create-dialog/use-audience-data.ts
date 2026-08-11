'use client';

import { useMemo } from 'react';
import { useQuery } from '@/lib/async-query';
import { apiClient } from '@/lib/api-client';
import { previewAnnouncementRecipients } from '@/lib/announcements/services';
import type { AnnouncementTargetType } from '@/lib/announcements/types';
import type { ChipOption, DeanBatchLite } from './types';
import { targetRolesFromFlags } from './utils';

function asList(raw: unknown, keys: string[]): any[] {
  if (Array.isArray(raw)) return raw;
  const o = raw as Record<string, unknown> | null;
  for (const k of keys) {
    const v = o?.[k];
    if (Array.isArray(v)) return v;
  }
  return [];
}

export function useAudienceData(args: {
  open: boolean;
  isDean: boolean;
  step: number;
  targetType: AnnouncementTargetType;
  selectedDepartments: string[];
  selectedBatches: string[];
  selectedSections: string[];
  includeStudents: boolean;
  includeTeachers: boolean;
  deanFacultyId: number;
}) {
  const {
    open,
    isDean,
    step,
    targetType,
    selectedDepartments,
    selectedBatches,
    includeStudents,
    includeTeachers,
    deanFacultyId,
  } = args;

  const selectedBatchesKey = selectedBatches.slice().sort().join(',');

  const { data: batchesPayload } = useQuery({
    queryKey: ['announcements', 'batches', isDean ? 'dean' : 'all'],
    queryFn: () =>
      isDean
        ? apiClient('/dean/batches')
        : apiClient('/batches'),
    enabled: open,
  });
  const { data: sectionsPayload } = useQuery({
    queryKey: ['announcements', 'sections', selectedBatchesKey],
    queryFn: async () => {
      const ids = selectedBatchesKey ? selectedBatchesKey.split(',') : [];
      if (!ids.length) return [];
      const results = await Promise.all(
        ids.map((id) => apiClient(`/batch-sections?batchId=${id}`)),
      );
      return results.flatMap((raw) => asList(raw, ['sections', 'results', 'data']));
    },
    enabled: open && Boolean(selectedBatchesKey),
  });
  const { data: departmentsPayload } = useQuery({
    queryKey: ['announcements', 'dean', 'departments'],
    queryFn: () => apiClient('/departments'),
    enabled: open,
  });
  const { data: meVisibilityPayload } = useQuery({
    queryKey: ['announcements', 'me-visibility', 'create-dialog'],
    queryFn: () =>
      apiClient<{ deanPrimaryFacultyId: number | null }>('/announcements/me-visibility'),
    enabled: isDean && open,
  });

  const deanBatches: DeanBatchLite[] = asList(batchesPayload, ['batches', 'results', 'data']);
  const allDepartments = asList(departmentsPayload, ['departments', 'results', 'data']);
  const effectiveDeanFacultyId =
    Number(meVisibilityPayload?.deanPrimaryFacultyId ?? 0) || deanFacultyId || 0;

  const departmentOptions: ChipOption[] = useMemo(
    () =>
      allDepartments
        .filter((dep: any) => {
          const depFacultyId = Number(dep?.facultyId ?? dep?.faculty?.id ?? 0);
          if (effectiveDeanFacultyId > 0) return depFacultyId === effectiveDeanFacultyId;
          return true;
        })
        .filter((dep: any) => dep?.id != null)
        .map((dep: any) => ({
          id: String(dep.id),
          name: String(dep?.name ?? `Department ${dep.id}`),
        })),
    [allDepartments, effectiveDeanFacultyId],
  );

  const batchOptions: ChipOption[] = useMemo(() => {
    if (selectedDepartments.length === 0) return [];
    const depSet = new Set(selectedDepartments);
    return deanBatches
      .filter((b) => {
        const depId = b.program?.department?.id ?? b.program?.departmentId;
        return depId != null && depSet.has(String(depId));
      })
      .map((b) => ({
        id: String(b.id),
        name: b.name,
        hint: b.program?.department?.name ?? '',
      }));
  }, [deanBatches, selectedDepartments]);

  const sectionOptions: ChipOption[] = useMemo(() => {
    const list = Array.isArray(sectionsPayload) ? sectionsPayload : [];
    const seen = new Set<string>();
    return list
      .map((s: { id: number | string; name: string; batch?: { name?: string } }) => ({
        id: String(s.id),
        name: s.name,
        hint: s.batch?.name,
      }))
      .filter((opt) => (seen.has(opt.id) ? false : (seen.add(opt.id), true)));
  }, [sectionsPayload]);

  const departmentIdsNum = useMemo(
    () => selectedDepartments.map((v) => Number(v)),
    [selectedDepartments],
  );
  const batchIdsNum = useMemo(() => selectedBatches.map((v) => Number(v)), [selectedBatches]);
  const sectionIdsNum = useMemo(
    () => args.selectedSections.map((v) => Number(v)),
    [args.selectedSections],
  );

  const previewKey = useMemo(() => {
    const facultyId =
      targetType === 'ALL' || targetType === 'FACULTY'
        ? effectiveDeanFacultyId || undefined
        : undefined;
    return {
      targetType,
      facultyId,
      departmentIds: targetType === 'DEPARTMENT' ? departmentIdsNum : undefined,
      batchIds: targetType === 'BATCH' ? batchIdsNum : undefined,
      sectionIds: targetType === 'SECTION' ? sectionIdsNum : undefined,
      targetRoles: targetRolesFromFlags(includeStudents, includeTeachers),
    };
  }, [
    targetType,
    departmentIdsNum,
    batchIdsNum,
    sectionIdsNum,
    includeStudents,
    includeTeachers,
    effectiveDeanFacultyId,
  ]);

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
    enabled: previewReady,
  });

  return {
    deanBatches,
    effectiveDeanFacultyId,
    departmentOptions,
    batchOptions,
    sectionOptions,
    departmentIdsNum,
    batchIdsNum,
    sectionIdsNum,
    previewReady,
    previewLoading,
    audiencePreview,
  };
}
