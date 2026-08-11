'use client';

import { useFormFields } from '@/features/ui/components/tanstack-form';
import { Button } from '@/features/ui/components/button';
import { DialogFooter } from '@/features/ui/components/dialog';
import type { CourseModule } from '@/lib/course-details/types';
import type { ResourceFormValues } from '@/lib/course-details/schemas/resource';
import {
  ResourceDraftField,
  ResourceModuleField,
  ResourceUrlField,
  typeSelectOptions
} from './resource-form-fields';
import { ResourceUploadSection } from './resource-upload-section';

type FormApi = ReturnType<
  typeof import('./use-resource-form-dialog').useResourceFormDialog
>['form'];

export function ResourceFormBody({
  form,
  editing,
  modules,
  pending,
  uploading,
  fileInputRef,
  audioInputRef,
  videoInputRef,
  onPickFile,
  onCancel
}: {
  form: FormApi;
  editing: boolean;
  modules: CourseModule[];
  pending: boolean;
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  audioInputRef: React.RefObject<HTMLInputElement | null>;
  videoInputRef: React.RefObject<HTMLInputElement | null>;
  onPickFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCancel: () => void;
}) {
  const { FormTextField, FormTextareaField, FormSelectField } =
    useFormFields<ResourceFormValues>();

  return (
    <form.AppForm>
      <form.Form className='space-y-3 py-2'>
        <FormTextField
          name='title'
          label='Title'
          placeholder='e.g. Chapter 3 — Slides'
          required
        />
        <FormTextareaField
          name='description'
          label='Description'
          placeholder='Optional — context, learning objectives, source attribution…'
          rows={2}
        />

        {!editing ? (
          <form.Subscribe
            selector={(state) => ({
              originalName: state.values.originalName,
              mimeType: state.values.mimeType
            })}
          >
            {({ originalName, mimeType }) => (
              <ResourceUploadSection
                fileInputRef={fileInputRef}
                audioInputRef={audioInputRef}
                videoInputRef={videoInputRef}
                uploading={uploading}
                originalName={originalName}
                mimeType={mimeType}
                onPickFile={onPickFile}
              />
            )}
          </form.Subscribe>
        ) : null}

        <form.AppField name='url'>
          {(field) => (
            <ResourceUrlField
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              field={field as any}
              onUrlChange={(value) => {
                field.handleChange(value);
                form.setFieldValue('originalName', null);
                form.setFieldValue('mimeType', null);
              }}
            />
          )}
        </form.AppField>

        <div className='grid grid-cols-2 gap-3'>
          <FormSelectField
            name='type'
            label='Type'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            options={typeSelectOptions as any}
          />
          <form.AppField name='moduleId'>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(field) => <ResourceModuleField field={field as any} modules={modules} />}
          </form.AppField>
        </div>

        <form.AppField name='is_draft'>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(field) => <ResourceDraftField field={field as any} />}
        </form.AppField>

        <DialogFooter>
          <Button type='button' variant='outline' onClick={onCancel}>
            Cancel
          </Button>
          <Button type='submit' disabled={pending || uploading}>
            {pending ? 'Saving…' : editing ? 'Save changes' : 'Add'}
          </Button>
        </DialogFooter>
      </form.Form>
    </form.AppForm>
  );
}
