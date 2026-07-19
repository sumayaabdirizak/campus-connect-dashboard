'use client';

import { useEffect, useRef } from 'react';
import { useAppForm } from '@/components/ui/tanstack-form';
import { toast } from 'sonner';
import { useUploadResourceFile } from '../../api/resources-queries';
import type {
  CreateResourceData,
  Resource,
  UpdateResourceData,
} from '../../api/resources-types';
import { resourceFormSchema, type ResourceFormValues } from '../../schemas/resource';
import { blankValues, inferTypeFromMime } from './helpers';

type SubmitPayload =
  | { mode: 'create'; data: Omit<CreateResourceData, 'teacherId'> & { is_draft?: boolean } }
  | { mode: 'edit'; resourceId: number; data: UpdateResourceData };

export function useResourceFormDialog({
  open,
  editing,
  defaultModuleId,
  onSubmit,
}: {
  open: boolean;
  editing: Resource | null;
  defaultModuleId?: number | null;
  onSubmit: (payload: SubmitPayload) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const uploadMutation = useUploadResourceFile();

  const form = useAppForm({
    defaultValues: { ...blankValues, moduleId: defaultModuleId ?? null } as ResourceFormValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: resourceFormSchema as any },
    onSubmit: ({ value }) => {
      if (editing) {
        onSubmit({
          mode: 'edit',
          resourceId: editing.id,
          data: {
            title: value.title,
            description: value.description,
            url: value.url,
            type: value.type,
            is_draft: value.is_draft,
            moduleId: value.moduleId,
          },
        });
      } else {
        onSubmit({
          mode: 'create',
          data: {
            title: value.title,
            description: value.description || undefined,
            url: value.url,
            type: value.type,
            originalName: value.originalName,
            mimeType: value.mimeType,
            moduleId: value.moduleId,
            is_draft: value.is_draft,
          },
        });
      }
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        title: editing.title,
        description: editing.description ?? '',
        url: editing.url,
        type: editing.type,
        originalName: editing.originalName,
        mimeType: editing.mimeType,
        moduleId: editing.moduleId,
        is_draft: editing.is_draft,
      } as ResourceFormValues);
    } else {
      form.reset({ ...blankValues, moduleId: defaultModuleId ?? null } as ResourceFormValues);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, defaultModuleId]);

  const handlePickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      toast.error(`"${file.name}" exceeds the 100 MB limit`);
      return;
    }
    uploadMutation.mutate(file, {
      onSuccess: (result) => {
        form.setFieldValue('url', result.url);
        form.setFieldValue('originalName', result.originalName);
        form.setFieldValue('mimeType', result.mimeType);
        form.setFieldValue('type', inferTypeFromMime(result.mimeType));
        if (!form.getFieldValue('title').trim()) {
          form.setFieldValue('title', result.originalName);
        }
        toast.success(`Uploaded "${result.originalName}"`);
      },
      onError: (e: Error) => toast.error(e.message),
    });
  };

  return {
    form,
    fileInputRef,
    audioInputRef,
    videoInputRef,
    uploadMutation,
    handlePickFile,
  };
}
