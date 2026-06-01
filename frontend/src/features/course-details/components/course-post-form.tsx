'use client';

import { useRef, useState } from 'react';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { Button } from '@/components/ui/button';
import { Paperclip, X as XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { coursePostSchema, type CoursePostFormValues } from '../schemas/course-post';

/**
 * Create-post form for the Feed tab. Replaces the previous 4-state
 * `useState` ladder (title, content, important, files) with the project's
 * standard TanStack Form + Zod pipeline for the JSON fields, plus a tiny
 * local `pendingFiles` state for the staged uploads.
 *
 * Why files stay outside the form state:
 *   - File objects don't belong in form values (Zod can't meaningfully
 *     validate them, and they can't be serialised for the post-create
 *     JSON body anyway — they ride a separate multipart upload step).
 *   - The submit pipeline is two-call: createPost(text fields), then
 *     uploadAttachments(postId, files) once the post id exists.
 *   - This component exposes the files via `onSubmit`'s second argument
 *     so the parent can chain the two mutations.
 *
 * File-picker validation (25 MB / file, 10 files max) lives in the picker
 * handler so the user sees a toast immediately when they pick a bad file,
 * instead of having to wait until submit time.
 */
export interface CoursePostFormProps {
  onSubmit: (values: CoursePostFormValues, files: File[]) => void;
  onCancel: () => void;
  submitting?: boolean;
  uploading?: boolean;
}

const MAX_FILES = 10;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

export function CoursePostForm({
  onSubmit,
  onCancel,
  submitting,
  uploading
}: CoursePostFormProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const form = useAppForm({
    defaultValues: { title: '', content: '', isImportant: false } as CoursePostFormValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: coursePostSchema as any },
    onSubmit: ({ value }) => onSubmit(value, pendingFiles)
  });

  const { FormTextField, FormTextareaField, FormCheckboxField } =
    useFormFields<CoursePostFormValues>();

  const pickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    e.target.value = '';
    const oversized = list.find((f) => f.size > MAX_FILE_BYTES);
    if (oversized) {
      toast.error(`"${oversized.name}" exceeds 25 MB`);
      return;
    }
    setPendingFiles((prev) => {
      const next = [...prev, ...list];
      if (next.length > MAX_FILES) {
        toast.error(`At most ${MAX_FILES} files per post`);
        return next.slice(0, MAX_FILES);
      }
      return next;
    });
  };

  const removePending = (i: number) =>
    setPendingFiles((prev) => prev.filter((_, idx) => idx !== i));

  // We render our own footer label that reflects both mutations' states.
  const buttonLabel = submitting ? 'Posting…' : uploading ? 'Uploading…' : 'Post';

  return (
    <form.AppForm>
      <form.Form className='space-y-4 py-2'>
        <FormTextField name='title' label='Title' placeholder='Title' required />
        <FormTextareaField
          name='content'
          label='Content'
          placeholder='Content'
          rows={4}
          required
        />

        <div className='space-y-2'>
          <input
            ref={fileInputRef}
            type='file'
            multiple
            onChange={pickFiles}
            className='hidden'
          />
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='gap-1 w-full'
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className='w-4 h-4' /> Attach files
          </Button>
          {pendingFiles.length > 0 && (
            <ul className='space-y-1'>
              {pendingFiles.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className='flex items-center justify-between text-xs bg-muted/40 rounded px-2 py-1'
                >
                  <span className='truncate'>
                    {f.name}{' '}
                    <span className='text-muted-foreground'>
                      ({(f.size / 1024).toFixed(1)} KB)
                    </span>
                  </span>
                  <button
                    type='button'
                    onClick={() => removePending(i)}
                    className='text-muted-foreground hover:text-destructive'
                    aria-label={`Remove ${f.name}`}
                  >
                    <XIcon className='w-3.5 h-3.5' />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className='text-[10px] text-muted-foreground'>Up to 10 files, 25 MB each.</p>
        </div>

        <FormCheckboxField name='isImportant' label='Mark as important' />

        <div className='flex justify-end gap-2 pt-2'>
          <Button type='button' variant='outline' onClick={onCancel}>
            Cancel
          </Button>
          <Button type='submit' disabled={submitting || uploading}>
            {buttonLabel}
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}
