'use client';

import { useCallback, type MutableRefObject } from 'react';
import type { Announcement } from '../../api/types';
import {
  buildTargetingPayload,
  buildDraftJsonPayload,
  buildDraftFormData,
} from './build-payload';
import {
  canPersistDraftContent,
  useDraftAutosave,
} from './use-draft-autosave';
import type { useAudienceData } from './use-audience-data';
import type { useCreateDialogFields } from './use-create-dialog-fields';

type Fields = ReturnType<typeof useCreateDialogFields>;
type Audience = ReturnType<typeof useAudienceData>;

export function useCreateDialogDraft(args: {
  open: boolean;
  canPublish: boolean;
  isEditMode: boolean;
  isDean: boolean;
  editingAnnouncement: Announcement | null | undefined;
  fields: Fields;
  audience: Audience;
  autosaveDebounceRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  composerRemoteIdRef: MutableRefObject<number | null>;
}) {
  const { fields, audience, isDean } = args;

  const targeting = useCallback(
    () =>
      buildTargetingPayload({
        targetType: fields.targetType,
        effectiveDeanFacultyId: audience.effectiveDeanFacultyId,
        departmentIdsNum: audience.departmentIdsNum,
        batchIdsNum: audience.batchIdsNum,
        sectionIdsNum: audience.sectionIdsNum,
      }),
    [
      fields.targetType,
      audience.effectiveDeanFacultyId,
      audience.departmentIdsNum,
      audience.batchIdsNum,
      audience.sectionIdsNum,
    ],
  );

  const draftCore = useCallback(() => {
    const { primary, targets } = targeting();
    return {
      title: fields.title,
      content: fields.content,
      priority: fields.priority,
      targetType: fields.targetType,
      includeStudents: fields.includeStudents,
      includeTeachers: fields.includeTeachers,
      primary,
      targets,
      expiresAtCustom: fields.expiresAtCustom,
      activeDaysPreset: fields.activeDaysPreset,
      deadlineAtLocal: fields.deadlineAtLocal,
    };
  }, [targeting, fields]);

  const buildDraftJson = useCallback(() => buildDraftJsonPayload(draftCore()), [draftCore]);
  const buildDraftForm = useCallback(
    () => buildDraftFormData({ ...draftCore(), images: fields.images }),
    [draftCore, fields.images],
  );

  const audienceReadyForDraft = useCallback((): boolean => {
    if (fields.step < 2) return false;
    const tt = fields.targetType;
    if (
      (tt === 'DEPARTMENT' || tt === 'BATCH' || tt === 'SECTION') &&
      (audience.departmentOptions.length === 0 || fields.selectedDepartments.length === 0)
    ) {
      return false;
    }
    if ((tt === 'BATCH' || tt === 'SECTION') && fields.selectedBatches.length === 0) return false;
    if (tt === 'SECTION' && fields.selectedSections.length === 0) return false;
    if (!fields.includeStudents && !fields.includeTeachers) return false;
    if ((tt === 'ALL' || tt === 'FACULTY') && isDean && !audience.effectiveDeanFacultyId) {
      return false;
    }
    return true;
  }, [fields, audience.departmentOptions.length, audience.effectiveDeanFacultyId, isDean]);

  const { flushAutosave } = useDraftAutosave({
    open: args.open,
    canPublish: args.canPublish,
    isSubmitting: fields.isSubmitting,
    isEditMode: args.isEditMode,
    editingAnnouncement: args.editingAnnouncement,
    canPersistDraftCreate: () =>
      audienceReadyForDraft() && canPersistDraftContent(fields.title, fields.content),
    buildDraftJson,
    buildDraftForm,
    images: fields.images,
    autosaveDebounceRef: args.autosaveDebounceRef,
    composerRemoteIdRef: args.composerRemoteIdRef,
    formFingerprint: [
      fields.title,
      fields.content,
      fields.priority,
      fields.targetType,
      fields.selectedDepartments.join(),
      fields.selectedBatches.join(),
      fields.selectedSections.join(),
      fields.includeStudents,
      fields.includeTeachers,
      fields.expiresAtCustom,
      fields.activeDaysPreset,
      fields.deadlineAtLocal,
      fields.step,
      fields.images.map((i) => i.id).join(),
    ].join('|'),
  });

  return { targeting, flushAutosave };
}
