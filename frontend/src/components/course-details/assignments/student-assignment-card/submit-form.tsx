'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link as LinkIcon, Upload, Paperclip, X as XIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatFileSize } from './helpers';

export function SubmitForm({
  hasSubmitted,
  submitMode,
  onSubmitModeChange,
  submitUrl,
  onSubmitUrlChange,
  pendingFile,
  onPendingFileChange,
  fileInputRef,
  isSubmitting,
  onSubmit,
}: {
  hasSubmitted: boolean;
  submitMode: 'link' | 'file';
  onSubmitModeChange: (mode: 'link' | 'file') => void;
  submitUrl: string;
  onSubmitUrlChange: (v: string) => void;
  pendingFile: File | null;
  onPendingFileChange: (f: File | null) => void;
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  isSubmitting: boolean;
  onSubmit: () => void;
}) {
  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error(`"${file.name}" exceeds the 25 MB limit`);
      e.target.value = '';
      return;
    }
    onPendingFileChange(file);
    e.target.value = '';
  };

  return (
    <div className='space-y-2'>
      <div className='inline-flex rounded-md border p-0.5 text-xs'>
        <button
          type='button'
          onClick={() => onSubmitModeChange('link')}
          className={`px-2.5 py-1 rounded transition-colors inline-flex items-center gap-1 ${
            submitMode === 'link'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LinkIcon className='w-3 h-3' /> Link
        </button>
        <button
          type='button'
          onClick={() => onSubmitModeChange('file')}
          className={`px-2.5 py-1 rounded transition-colors inline-flex items-center gap-1 ${
            submitMode === 'file'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Upload className='w-3 h-3' /> File
        </button>
      </div>
      <div className='flex min-w-0 flex-wrap gap-2'>
        {submitMode === 'link' ? (
          <Input
            placeholder='Paste a link to your work...'
            className='min-w-0 flex-1 bg-background'
            value={submitUrl}
            onChange={(e) => onSubmitUrlChange(e.target.value)}
          />
        ) : (
          <div className='flex-1 flex items-center gap-2'>
            <input
              ref={fileInputRef}
              type='file'
              onChange={handlePickFile}
              className='hidden'
            />
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='gap-1 shrink-0'
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className='w-3.5 h-3.5' /> Choose a file
            </Button>
            {pendingFile ? (
              <div className='flex items-center gap-2 text-xs min-w-0 flex-1'>
                <span className='truncate'>{pendingFile.name}</span>
                <span className='text-muted-foreground shrink-0'>
                  {formatFileSize(pendingFile.size)}
                </span>
                <button
                  type='button'
                  onClick={() => onPendingFileChange(null)}
                  className='text-muted-foreground hover:text-destructive'
                  aria-label='Remove file'
                >
                  <XIcon className='w-3 h-3' />
                </button>
              </div>
            ) : (
              <span className='text-xs text-muted-foreground'>No file yet · 25 MB max</span>
            )}
          </div>
        )}
        <Button
          onClick={onSubmit}
          disabled={
            isSubmitting ||
            (submitMode === 'link' && !submitUrl.trim()) ||
            (submitMode === 'file' && !pendingFile)
          }
        >
          {isSubmitting ? (
            <>
              <Loader2 className='w-4 h-4 mr-1 animate-spin' />
              Submitting…
            </>
          ) : hasSubmitted ? (
            'Resubmit'
          ) : (
            'Submit'
          )}
        </Button>
      </div>
    </div>
  );
}
