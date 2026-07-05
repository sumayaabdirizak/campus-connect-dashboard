'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@/lib/async-query';
import { uploadCourseCover } from '../api/service';

interface CourseCoverDialogProps {
  offeringId: string;
  currentCover?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_BYTES = 5 * 1024 * 1024;

export function CourseCoverDialog({
  offeringId,
  currentCover,
  open,
  onOpenChange
}: CourseCoverDialogProps) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const f = event.target.files?.[0];
    event.target.value = '';
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setError('Image must be under 5 MB.');
      return;
    }
    setError(null);
    setFile(f);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  };

  const close = (next: boolean) => {
    if (!next) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(null);
      setPreviewUrl(null);
      setError(null);
    }
    onOpenChange(next);
  };

  const save = async () => {
    if (!file) return;
    setSaving(true);
    setError(null);
    try {
      await uploadCourseCover(offeringId, file);
      queryClient.invalidateQueries({ queryKey: ['teacher-course-detail', offeringId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-courses'] });
      close(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Show the freshly-picked preview if any, otherwise the existing cover.
  const shown = previewUrl ?? currentCover ?? null;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Course cover image</DialogTitle>
          <DialogDescription>
            Upload an image to use as this course&apos;s header banner.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-3'>
          <div className='relative aspect-[16/6] w-full overflow-hidden rounded-lg border bg-muted'>
            {shown ? (
              // Plain img (not next/image) so blob: previews and arbitrary
              // upload hosts render without remote-domain configuration.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shown} alt='Cover preview' className='h-full w-full object-cover' />
            ) : (
              <div className='flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground'>
                <ImagePlus className='size-8' />
                <span className='text-xs'>No cover yet</span>
              </div>
            )}
          </div>

          <input
            ref={inputRef}
            type='file'
            accept='image/png,image/jpeg,image/webp,image/gif'
            className='hidden'
            onChange={pickFile}
          />
          <Button
            type='button'
            variant='outline'
            className='w-full gap-2'
            onClick={() => inputRef.current?.click()}
            disabled={saving}
          >
            <Upload className='size-4' />
            {file ? 'Choose a different image' : 'Choose image'}
          </Button>
          <p className='text-xs text-muted-foreground'>
            PNG, JPG, WEBP or GIF · up to 5 MB · applies to all sections of this course.
          </p>
          {error && <p className='text-sm text-destructive'>{error}</p>}
        </div>

        <DialogFooter>
          <Button variant='ghost' onClick={() => close(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!file || saving} className='gap-2'>
            {saving && <Loader2 className='size-4 animate-spin' />}
            Save cover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
