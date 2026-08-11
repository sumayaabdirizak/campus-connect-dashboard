'use client';

import { Button } from '@/features/ui/components/button';
import { Label } from '@/features/ui/components/label';
import { Separator } from '@/features/ui/components/separator';
import { FileAudio, FileVideo, Upload } from 'lucide-react';
import { FILE_ACCEPT } from './helpers';

export function ResourceUploadSection({
  fileInputRef,
  audioInputRef,
  videoInputRef,
  uploading,
  originalName,
  mimeType,
  onPickFile
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  audioInputRef: React.RefObject<HTMLInputElement | null>;
  videoInputRef: React.RefObject<HTMLInputElement | null>;
  uploading: boolean;
  originalName: string | null;
  mimeType: string | null;
  onPickFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <>
      <div className='space-y-2'>
        <Label>File</Label>
        <input
          ref={fileInputRef}
          type='file'
          accept={FILE_ACCEPT}
          onChange={onPickFile}
          className='hidden'
        />
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='gap-1.5 w-full'
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className='w-4 h-4' />
          {uploading
            ? 'Uploading…'
            : originalName
              ? `Replace file (${originalName})`
              : 'Upload file'}
        </Button>
        {originalName && mimeType ? (
          <p className='text-[10px] text-muted-foreground'>
            {originalName} · {mimeType}
          </p>
        ) : null}
      </div>

      <div className='space-y-1.5'>
        <Label>Audio / Video</Label>
        <input
          ref={audioInputRef}
          type='file'
          accept='audio/*'
          onChange={onPickFile}
          className='hidden'
        />
        <input
          ref={videoInputRef}
          type='file'
          accept='video/*'
          onChange={onPickFile}
          className='hidden'
        />
        <div className='grid grid-cols-2 gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='gap-1.5'
            onClick={() => audioInputRef.current?.click()}
            disabled={uploading}
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
            disabled={uploading}
          >
            <FileVideo className='w-4 h-4' />
            Upload video
          </Button>
        </div>
        <p className='text-[10px] text-muted-foreground'>Audio or video file, up to 100 MB.</p>
      </div>

      <div className='flex items-center gap-2'>
        <Separator className='flex-1' />
        <span className='text-[10px] text-muted-foreground'>or paste a link</span>
        <Separator className='flex-1' />
      </div>
    </>
  );
}
