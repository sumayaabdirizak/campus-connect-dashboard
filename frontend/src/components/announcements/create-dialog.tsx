'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Sheet, SheetContent } from '@/features/ui/components/sheet';
import { useAuthStore } from '@/lib/auth-store';
import { toast } from 'sonner';
import { useQueryClient } from '@/lib/async-query';
import { deleteAnnouncement, updateAnnouncement } from '@/lib/announcements/services';
import type { CreateDialogProps } from './create-dialog/types';
import { validateComposeStep, validateAudienceStep } from './create-dialog/validate';
import { useAudienceData } from './create-dialog/use-audience-data';
import { DialogProgressHeader } from './create-dialog/dialog-progress-header';
import { DialogStepFooter } from './create-dialog/dialog-step-footer';
import { publishAnnouncement } from './create-dialog/publish-announcement';
import { useCreateDialogFields } from './create-dialog/use-create-dialog-fields';
import { CreateDialogBody } from './create-dialog/create-dialog-body';
import { useDialogLifecycle } from './create-dialog/use-dialog-lifecycle';
import { useCreateDialogDraft } from './create-dialog/use-create-dialog-draft';

export function CreateDialog({
  open,
  onOpenChange,
  onSubmit,
  editingAnnouncement = null,
}: CreateDialogProps) {
  const { user } = useAuthStore();
  const isDean = user?.role === 'DEAN';
  const canPublish = user?.role === 'DEAN' || user?.role === 'SUPER_ADMIN';
  const isEditMode = Boolean(editingAnnouncement);
  const queryClient = useQueryClient();
  const fields = useCreateDialogFields(isDean);
  const autosaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composerRemoteIdRef = useRef<number | null>(null);
  const deanFacultyId = Number(
    (user as { scope?: { facultyId?: number }; facultyId?: number })?.scope?.facultyId ??
      (user as { facultyId?: number })?.facultyId ??
      0,
  );

  const audience = useAudienceData({
    open,
    isDean,
    step: fields.step,
    targetType: fields.targetType,
    selectedDepartments: fields.selectedDepartments,
    selectedBatches: fields.selectedBatches,
    selectedSections: fields.selectedSections,
    includeStudents: fields.includeStudents,
    includeTeachers: fields.includeTeachers,
    deanFacultyId,
  });

  useEffect(() => {
    const labels = { 1: 'Compose', 2: 'Audience', 3: 'Review' } as const;
    fields.setStepLive(`Step ${fields.step} of 3: ${labels[fields.step]}`);
  }, [fields.step, fields.setStepLive]);

  const { targeting, flushAutosave } = useCreateDialogDraft({
    open,
    canPublish,
    isEditMode,
    isDean,
    editingAnnouncement,
    fields,
    audience,
    autosaveDebounceRef,
    composerRemoteIdRef,
  });

  const { resetForm } = useDialogLifecycle({
    open,
    isDean,
    editingAnnouncement,
    fields,
    autosaveDebounceRef,
    composerRemoteIdRef,
  });

  const validateStep = (): boolean => {
    if (fields.step === 1) {
      const nextErrors = validateComposeStep(fields.title, fields.content);
      fields.setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) {
        const focusId = nextErrors.title ? 'title' : nextErrors.content ? 'content' : null;
        if (focusId) requestAnimationFrame(() => document.getElementById(focusId)?.focus());
        return false;
      }
      return true;
    }
    if (fields.step === 2) {
      return validateAudienceStep({
        targetType: fields.targetType,
        departmentOptionsLength: audience.departmentOptions.length,
        selectedDepartmentsLength: fields.selectedDepartments.length,
        selectedBatchesLength: fields.selectedBatches.length,
        selectedSectionsLength: fields.selectedSections.length,
        includeStudents: fields.includeStudents,
        includeTeachers: fields.includeTeachers,
      });
    }
    return true;
  };

  const handleSheetOpenChange = useCallback(
    async (next: boolean) => {
      if (!next && open && canPublish) {
        if (isEditMode && editingAnnouncement?.status !== 'DRAFT') {
          onOpenChange(next);
          return;
        }
        await flushAutosave();
      }
      onOpenChange(next);
    },
    [open, onOpenChange, flushAutosave, canPublish, isEditMode, editingAnnouncement?.status],
  );

  const handleSubmit = async () => {
    fields.setFormError(null);
    if (!validateStep()) return;
    if (autosaveDebounceRef.current) {
      clearTimeout(autosaveDebounceRef.current);
      autosaveDebounceRef.current = null;
    }
    fields.setIsSubmitting(true);
    try {
      await publishAnnouncement({
        title: fields.title,
        content: fields.content,
        priority: fields.priority,
        targetType: fields.targetType,
        includeStudents: fields.includeStudents,
        includeTeachers: fields.includeTeachers,
        expiresAtCustom: fields.expiresAtCustom,
        activeDaysPreset: fields.activeDaysPreset,
        deadlineAtLocal: fields.deadlineAtLocal,
        notifySms: fields.notifySms,
        images: fields.images,
        targeting: targeting(),
        isEditMode,
        remoteDraftId: composerRemoteIdRef.current,
        onSubmit,
        updateExisting: updateAnnouncement,
        deleteExisting: async (id) => {
          await deleteAnnouncement(id);
          composerRemoteIdRef.current = null;
        },
        invalidate: () => {
          void queryClient.invalidateQueries({ queryKey: ['announcements'] });
        },
      });
      toast.success(
        isEditMode ? 'Announcement updated successfully!' : 'Announcement posted successfully!',
      );
      resetForm();
      onOpenChange(false);
    } catch {
      fields.setFormError('Failed to post announcement. Please try again.');
    } finally {
      fields.setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange} modal>
      <SheetContent
        side='right'
        className='flex w-full flex-col border-s border-border bg-background p-0 shadow-2xl sm:max-w-[560px]'
        onOpenAutoFocus={(e) => {
          if (fields.step === 1) {
            e.preventDefault();
            requestAnimationFrame(() => document.getElementById('title')?.focus());
          }
        }}
      >
        <DialogProgressHeader
          isEditMode={isEditMode}
          isDraftEdit={String(editingAnnouncement?.status ?? '').toUpperCase() === 'DRAFT'}
          step={fields.step}
          stepLive={fields.stepLive}
          setStep={fields.setStep}
        />
        <CreateDialogBody
          formError={fields.formError}
          fields={fields}
          audience={audience}
          isDean={isDean}
          isEditMode={isEditMode}
        />
        <DialogStepFooter
          step={fields.step}
          title={fields.title}
          content={fields.content}
          isSubmitting={fields.isSubmitting}
          isEditMode={isEditMode}
          onCancelOrBack={() => {
            if (fields.step === 1) onOpenChange(false);
            else fields.setStep((prev) => (prev - 1) as 1 | 2 | 3);
          }}
          onContinue={() => {
            if (!validateStep()) return;
            fields.setStep((prev) => (prev + 1) as 1 | 2 | 3);
          }}
          onSubmit={handleSubmit}
        />
      </SheetContent>
    </Sheet>
  );
}
