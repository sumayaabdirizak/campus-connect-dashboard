'use client';

import { Button } from '@/features/ui/components/button';
import { FieldLabel } from '@/features/ui/components/field';
import { FileAudio, FileVideo, Upload } from 'lucide-react';
import type { ResourceType } from '@/lib/course-details/types';
import { FILE_ACCEPT } from './helpers';

/// One picker per type, chosen by the Type field above. Showing all three at
/// once made the teacher decide twice — once by picking a button, again by
/// setting Type — and the two could disagree.
const PICKERS = {
  LECTURE_NOTE: { label: 'File', accept: FILE_ACCEPT, cta: 'Upload file', icon: Upload, hint: 'PDF, slides, or document.' },
  AUDIO: { label: 'Audio', accept: 'audio/*', cta: 'Upload audio', icon: FileAudio, hint: 'Audio file, up to 100 MB.' },
  VIDEO: { label: 'Video', accept: 'video/*', cta: 'Upload video', icon: FileVideo, hint: 'Video file, up to 100 MB.' }
} as const;

type PickerType = keyof typeof PICKERS;

const isPickerType = (t: ResourceType): t is PickerType => t in PICKERS;

export function ResourceUploadSection({
  type,
  fileInputRef,
  audioInputRef,
  videoInputRef,
  uploading,
  originalName,
  mimeType,
  onPickFile
}: {
  type: ResourceType;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  audioInputRef: React.RefObject<HTMLInputElement | null>;
  videoInputRef: React.RefObject<HTMLInputElement | null>;
  uploading: boolean;
  originalName: string | null;
  mimeType: string | null;
  onPickFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  // A link has nothing to upload — the URL field below is the whole input.
  if (!isPickerType(type)) return null;

  const picker = PICKERS[type];
  const Icon = picker.icon;
  const ref =
    type === 'AUDIO' ? audioInputRef : type === 'VIDEO' ? videoInputRef : fileInputRef;

  return (
    <div className='flex w-full flex-col gap-3 [&>*]:w-full'>
      <FieldLabel>{picker.label}</FieldLabel>
      <input
        ref={ref}
        type='file'
        accept={picker.accept}
        onChange={onPickFile}
        className='hidden'
      />
      <Button
        type='button'
        variant='outline'
        size='sm'
        className='gap-1.5 w-full'
        onClick={() => ref.current?.click()}
        disabled={uploading}
      >
        <Icon className='w-4 h-4' />
        {uploading
          ? 'Uploading…'
          : originalName
            ? `Replace (${originalName})`
            : picker.cta}
      </Button>
      {originalName && mimeType ? (
        <p className='text-[10px] text-muted-foreground'>
          {originalName} · {mimeType}
        </p>
      ) : (
        <p className='text-[10px] text-muted-foreground'>{picker.hint}</p>
      )}
    </div>
  );
}
