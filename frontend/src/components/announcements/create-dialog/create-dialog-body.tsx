'use client';

import { StepCompose } from './step-compose';
import { StepAudience } from './step-audience';
import { StepReviewOptions } from './step-review-options';
import { StepReviewSummary } from './step-review-summary';
import type { useAudienceData } from './use-audience-data';
import type { useCreateDialogFields } from './use-create-dialog-fields';

type Fields = ReturnType<typeof useCreateDialogFields>;
type Audience = ReturnType<typeof useAudienceData>;

type Props = {
  formError: string | null;
  fields: Fields;
  audience: Audience;
  isDean: boolean;
  isEditMode: boolean;
};

export function CreateDialogBody({
  formError,
  fields,
  audience,
  isDean,
  isEditMode,
}: Props) {
  const { step } = fields;

  return (
    <div className='flex-1 space-y-5 overflow-y-auto bg-muted/60 px-5 py-5'>
      {formError ? (
        <div
          role='alert'
          className='rounded-xl border-2 border-destructive/50 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive'
        >
          {formError}
        </div>
      ) : null}

      {step === 1 ? (
        <StepCompose
          title={fields.title}
          content={fields.content}
          errors={fields.errors}
          images={fields.images}
          onTitleChange={fields.setTitle}
          onContentChange={fields.setContent}
          onClearTitleError={() => fields.setErrors((prev) => ({ ...prev, title: undefined }))}
          onClearContentError={() =>
            fields.setErrors((prev) => ({ ...prev, content: undefined }))
          }
          onImagesChange={fields.setImages}
        />
      ) : null}

      {step === 2 ? (
        <StepAudience
          isDean={isDean}
          targetType={fields.targetType}
          setTargetType={fields.setTargetType}
          selectedDepartments={fields.selectedDepartments}
          selectedBatches={fields.selectedBatches}
          selectedSections={fields.selectedSections}
          setSelectedDepartments={fields.setSelectedDepartments}
          setSelectedBatches={fields.setSelectedBatches}
          setSelectedSections={fields.setSelectedSections}
          departmentOptions={audience.departmentOptions}
          batchOptions={audience.batchOptions}
          sectionOptions={audience.sectionOptions}
          deanBatches={audience.deanBatches}
          includeStudents={fields.includeStudents}
          includeTeachers={fields.includeTeachers}
          setIncludeStudents={fields.setIncludeStudents}
          setIncludeTeachers={fields.setIncludeTeachers}
          previewReady={audience.previewReady}
          previewLoading={audience.previewLoading}
          audiencePreview={audience.audiencePreview ?? null}
        />
      ) : null}

      {step === 3 ? (
        <div className='space-y-4'>
          <StepReviewOptions
            priority={fields.priority}
            setPriority={fields.setPriority}
            activeDaysPreset={fields.activeDaysPreset}
            setActiveDaysPreset={fields.setActiveDaysPreset}
            expiresAtCustom={fields.expiresAtCustom}
            setExpiresAtCustom={fields.setExpiresAtCustom}
            deadlineAtLocal={fields.deadlineAtLocal}
            setDeadlineAtLocal={fields.setDeadlineAtLocal}
          />
          <StepReviewSummary
            title={fields.title}
            content={fields.content}
            imageCount={fields.images.length}
            targetType={fields.targetType}
            selectedDepartments={fields.selectedDepartments}
            selectedBatches={fields.selectedBatches}
            selectedSections={fields.selectedSections}
            includeStudents={fields.includeStudents}
            includeTeachers={fields.includeTeachers}
            priority={fields.priority}
            activeDaysPreset={fields.activeDaysPreset}
            expiresAtCustom={fields.expiresAtCustom}
            deadlineAtLocal={fields.deadlineAtLocal}
            previewLoading={audience.previewLoading}
            audiencePreview={audience.audiencePreview}
          />
        </div>
      ) : null}
    </div>
  );
}
