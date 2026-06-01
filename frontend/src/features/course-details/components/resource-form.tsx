'use client';

import { useEffect, useRef } from 'react';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Upload, FileAudio, FileVideo } from 'lucide-react';
import { toast } from 'sonner';
import { useUploadResourceFile } from '../api/resources-queries';
import type {
  CourseModule,
  CreateResourceData,
  Resource,
  ResourceType,
  UpdateResourceData
} from '../api/resources-types';
import { humanizeType } from './resource-renderers';
import {
  RESOURCE_TYPE_VALUES,
  resourceFormSchema,
  type ResourceFormValues
} from '../schemas/resource';

const blankValues: ResourceFormValues = {
  title: '',
  description: '',
  url: '',
  type: 'LECTURE_NOTE',
  originalName: null,
  mimeType: null,
  moduleId: null,
  is_draft: false
};

function inferTypeFromMime(mime: string): ResourceType {
  if (mime.startsWith('audio/')) return 'AUDIO';
  if (mime.startsWith('video/')) return 'VIDEO';
  if (mime.includes('pdf')) return 'LECTURE_NOTE';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'LECTURE_NOTE';
  return 'OTHER';
}

interface ResourceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Resource | null;
  modules: CourseModule[];
  defaultModuleId?: number | null;
  pending: boolean;
  onSubmit: (
    payload:
      | { mode: 'create'; data: Omit<CreateResourceData, 'teacherId'> & { is_draft?: boolean } }
      | { mode: 'edit'; resourceId: number; data: UpdateResourceData }
  ) => void;
}

/**
 * Create / edit dialog for course resources.
 *
 * Migrated to `useAppForm` + Zod schema (see schemas/resource.ts). Most
 * fields are declarative (FormTextField / FormTextareaField / FormSelectField);
 * the file-upload + recorder paths use `form.setFieldValue` to coordinate
 * multi-field updates (url + originalName + mimeType + type + auto-title) in
 * a single batch when a file lands. The URL text input clears the
 * originalName / mimeType via the same imperative path because pasting a
 * raw link invalidates the "this came from an upload" provenance.
 *
 * Edit mode hides the upload + recorder UI — re-uploading would orphan
 * the previous file on disk; teachers must change the URL textually.
 */
export function ResourceFormDialog({
  open,
  onOpenChange,
  editing,
  modules,
  defaultModuleId,
  pending,
  onSubmit
}: ResourceFormDialogProps) {
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
            moduleId: value.moduleId
          }
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
            is_draft: value.is_draft
          }
        });
      }
    }
  });

  const { FormTextField, FormTextareaField, FormSelectField } =
    useFormFields<ResourceFormValues>();

  // Re-seed form values whenever the dialog opens — populate from the
  // editing target if there is one, otherwise reset to a blank create
  // with the default module pre-selected. Mirrors the old `initFor`.
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
        is_draft: editing.is_draft
      } as ResourceFormValues);
    } else {
      form.reset({ ...blankValues, moduleId: defaultModuleId ?? null } as ResourceFormValues);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
    // We intentionally omit `form` from the deps — it's stable across renders
    // and including it would cause an infinite reset loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, defaultModuleId]);

  // ── Shared handler: file upload result → form state ──────────────────────
  // Used by both the file-picker and the recorder. Updates 4–5 fields in one
  // go via setFieldValue. The auto-title rule kicks in only when the user
  // hasn't already typed a title — otherwise we'd clobber their work.
  const applyUploadResult = (
    result: { url: string; originalName: string; mimeType: string },
    autoTitle?: string
  ) => {
    form.setFieldValue('url', result.url);
    form.setFieldValue('originalName', result.originalName);
    form.setFieldValue('mimeType', result.mimeType);
    form.setFieldValue('type', inferTypeFromMime(result.mimeType));
    const currentTitle = form.getFieldValue('title');
    if (!currentTitle.trim()) {
      form.setFieldValue('title', autoTitle ?? result.originalName);
    }
  };

  // ── File picker ───────────────────────────────────────────────────────────

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
        applyUploadResult(result);
        toast.success(`Uploaded "${result.originalName}"`);
      },
      onError: (e: Error) => toast.error(e.message)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit material' : 'Add material'}</DialogTitle>
        </DialogHeader>
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

            {!editing && (
              <>
                {/* ── Upload from disk ─────────────────────────────────────── */}
                <div className='space-y-2'>
                  <Label>File</Label>
                  <input
                    ref={fileInputRef}
                    type='file'
                    accept='application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/epub+zip,application/zip,image/*,video/*,audio/*,text/*'
                    onChange={handlePickFile}
                    className='hidden'
                  />
                  {/* The "Replace file (xxx)" label needs to react to the live
                      originalName field — Subscribe gives us the value without
                      forcing the whole component to re-render on every field
                      mutation. */}
                  <form.Subscribe
                    selector={(state) => state.values.originalName}
                  >
                    {(originalName) => (
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='gap-1.5 w-full'
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadMutation.isPending}
                      >
                        <Upload className='w-4 h-4' />
                        {uploadMutation.isPending
                          ? 'Uploading…'
                          : originalName
                            ? `Replace file (${originalName})`
                            : 'Upload file'}
                      </Button>
                    )}
                  </form.Subscribe>
                  <form.Subscribe
                    selector={(state) => ({ name: state.values.originalName, mime: state.values.mimeType })}
                  >
                    {({ name, mime }) =>
                      name && mime ? (
                        <p className='text-[10px] text-muted-foreground'>
                          {name} · {mime}
                        </p>
                      ) : null
                    }
                  </form.Subscribe>
                </div>

                {/* ── Upload audio / video ─────────────────────────────────── */}
                <div className='space-y-1.5'>
                  <Label>Audio / Video</Label>
                  <input
                    ref={audioInputRef}
                    type='file'
                    accept='audio/*'
                    onChange={handlePickFile}
                    className='hidden'
                  />
                  <input
                    ref={videoInputRef}
                    type='file'
                    accept='video/*'
                    onChange={handlePickFile}
                    className='hidden'
                  />
                  <div className='grid grid-cols-2 gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='gap-1.5'
                      onClick={() => audioInputRef.current?.click()}
                      disabled={uploadMutation.isPending}
                    >
                      <FileAudio className='w-4 h-4' />
                      Upload audio
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='gap-1.5'
                      onClick={() => videoInputRef.current?.click()}
                      disabled={uploadMutation.isPending}
                    >
                      <FileVideo className='w-4 h-4' />
                      Upload video
                    </Button>
                  </div>
                  <p className='text-[10px] text-muted-foreground'>
                    Audio or video file, up to 100 MB.
                  </p>
                </div>

                <div className='flex items-center gap-2'>
                  <Separator className='flex-1' />
                  <span className='text-[10px] text-muted-foreground'>or paste a link</span>
                  <Separator className='flex-1' />
                </div>
              </>
            )}

            {/* URL — we use AppField so typing into the URL clears the
                originalName / mimeType (they no longer describe what's at
                this URL). FormTextField alone wouldn't let us coordinate
                the multi-field clear. */}
            <form.AppField name='url'>
              {(field) => (
                <div className='space-y-1'>
                  <Label htmlFor='resource-url'>URL</Label>
                  <Input
                    id='resource-url'
                    placeholder='Paste a link to a video, doc, etc.'
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      field.handleChange(e.target.value);
                      form.setFieldValue('originalName', null);
                      form.setFieldValue('mimeType', null);
                    }}
                  />
                  {field.state.meta.errors[0] && (
                    <p className='text-xs text-destructive'>
                      {String(field.state.meta.errors[0])}
                    </p>
                  )}
                </div>
              )}
            </form.AppField>

            <div className='grid grid-cols-2 gap-3'>
              <FormSelectField
                name='type'
                label='Type'
                options={RESOURCE_TYPE_VALUES.map((t) => ({
                  value: t,
                  label: humanizeType(t)
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                })) as any}
              />
              {/* Module is a number | null; the Select API works in strings,
                  so we serialize through '__none__' / String(id) the same way
                  the legacy form did. Wrapped in AppField for the conversion. */}
              <form.AppField name='moduleId'>
                {(field) => (
                  <div className='space-y-1.5'>
                    <Label>Module</Label>
                    <select
                      value={field.state.value == null ? '__none__' : String(field.state.value)}
                      onChange={(e) =>
                        field.handleChange(
                          e.target.value === '__none__' ? null : Number(e.target.value)
                        )
                      }
                      className='border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring'
                    >
                      <option value='__none__'>Ungrouped</option>
                      {modules.map((m) => (
                        <option key={m.id} value={String(m.id)}>
                          {m.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </form.AppField>
            </div>

            {/* `is_draft` toggle — wrap in AppField so the Switch primitive
                stays. FormCheckboxField would also work but the design uses
                a Switch with a label/description block. */}
            <form.AppField name='is_draft'>
              {(field) => (
                <div className='flex items-center justify-between rounded-md border p-3'>
                  <div>
                    <p className='text-sm font-medium'>Save as draft</p>
                    <p className='text-[11px] text-muted-foreground'>
                      Drafts are visible to teachers only.
                    </p>
                  </div>
                  <Switch
                    checked={field.state.value}
                    onCheckedChange={field.handleChange}
                  />
                </div>
              )}
            </form.AppField>

            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type='submit' disabled={pending || uploadMutation.isPending}>
                {pending ? 'Saving…' : editing ? 'Save changes' : 'Add'}
              </Button>
            </DialogFooter>
          </form.Form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}
