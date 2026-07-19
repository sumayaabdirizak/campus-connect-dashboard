'use client';

import { useCallback, useEffect, type MutableRefObject } from 'react';
import type { Announcement } from '../../api/types';
import type { useCreateDialogFields } from './use-create-dialog-fields';
import { hydrateFromAnnouncement } from './hydrate-form';

type Fields = ReturnType<typeof useCreateDialogFields>;

export function useDialogLifecycle(args: {
  open: boolean;
  isDean: boolean;
  editingAnnouncement: Announcement | null | undefined;
  fields: Fields;
  autosaveDebounceRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  composerRemoteIdRef: MutableRefObject<number | null>;
}) {
  const {
    open,
    isDean,
    editingAnnouncement,
    fields,
    autosaveDebounceRef,
    composerRemoteIdRef,
  } = args;

  const resetForm = useCallback(() => {
    fields.setStep(1);
    fields.setTitle('');
    fields.setContent('');
    fields.setTargetType(isDean ? 'DEPARTMENT' : 'ALL');
    fields.setSelectedDepartments([]);
    fields.setSelectedBatches([]);
    fields.setSelectedSections([]);
    fields.setPriority('normal');
    fields.setIncludeStudents(true);
    fields.setIncludeTeachers(true);
    fields.setActiveDaysPreset('off');
    fields.setExpiresAtCustom('');
    fields.setDeadlineAtLocal('');
    fields.setNotifySms(false);
    fields.setFormError(null);
    fields.setErrors({});
    fields.setImages((prev) => {
      prev.forEach((img) => {
        if (img.preview.startsWith('blob:')) URL.revokeObjectURL(img.preview);
      });
      return [];
    });
    if (autosaveDebounceRef.current) {
      clearTimeout(autosaveDebounceRef.current);
      autosaveDebounceRef.current = null;
    }
    composerRemoteIdRef.current = null;
  }, [fields, isDean, autosaveDebounceRef, composerRemoteIdRef]);

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(resetForm, 300);
      return () => clearTimeout(timer);
    }
  }, [open, resetForm]);

  useEffect(() => {
    if (!open || !editingAnnouncement) return;
    const h = hydrateFromAnnouncement(editingAnnouncement, isDean);
    fields.setStep(h.step);
    fields.setTitle(h.title);
    fields.setContent(h.content);
    fields.setPriority(h.priority);
    fields.setTargetType(h.targetType);
    fields.setIncludeStudents(h.includeStudents);
    fields.setIncludeTeachers(h.includeTeachers);
    fields.setActiveDaysPreset(h.activeDaysPreset);
    fields.setExpiresAtCustom(h.expiresAtCustom);
    fields.setDeadlineAtLocal(h.deadlineAtLocal);
    fields.setSelectedDepartments(h.selectedDepartments);
    fields.setSelectedBatches(h.selectedBatches);
    fields.setSelectedSections(h.selectedSections);
    fields.setImages(h.images);
    fields.setNotifySms(false);
    fields.setFormError(null);
    fields.setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once per open/edit
  }, [open, editingAnnouncement, isDean]);

  return { resetForm };
}
