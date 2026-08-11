'use client';

import { Input } from '@/features/ui/components/input';
import { Label } from '@/features/ui/components/label';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { AnnouncementRichEditor, computeReadability } from '../announcement-rich-editor';
import { ImagePicker } from '../image-picker';
import type { ImageFile } from './types';
import { htmlToPlain } from './utils';

type Props = {
  title: string;
  content: string;
  errors: { title?: string; content?: string };
  images: ImageFile[];
  onTitleChange: (v: string) => void;
  onContentChange: (v: string) => void;
  onClearTitleError: () => void;
  onClearContentError: () => void;
  onImagesChange: (images: ImageFile[]) => void;
};

export function StepCompose({
  title,
  content,
  errors,
  images,
  onTitleChange,
  onContentChange,
  onClearTitleError,
  onClearContentError,
  onImagesChange,
}: Props) {
  const plainLen = htmlToPlain(content).length;
  const readability = computeReadability(htmlToPlain(content));
  const tone = !readability
    ? ''
    : readability.score >= 60
      ? 'text-emerald-600 dark:text-emerald-400'
      : readability.score >= 40
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-destructive';

  return (
    <>
      <div className='space-y-2'>
        <Label htmlFor='title' className='text-xs font-medium text-foreground'>
          Title
        </Label>
        <Input
          id='title'
          value={title}
          onChange={(e) => {
            onTitleChange(e.target.value);
            if (errors.title) onClearTitleError();
          }}
          placeholder='Enter announcement title'
          aria-invalid={!!errors.title}
          className='h-11 rounded-xl border-input bg-background text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring'
        />
        {errors.title ? <p className='text-xs text-destructive'>{errors.title}</p> : null}
      </div>

      <div className='space-y-2'>
        <div className='flex items-center justify-between'>
          <Label htmlFor='content' className='text-xs font-medium text-foreground'>
            Message
          </Label>
          <span
            id='content-counter'
            aria-live='polite'
            className={cn(
              'text-[11px] tabular-nums',
              plainLen > 3000 ? 'font-semibold text-destructive' : 'text-muted-foreground',
            )}
          >
            {plainLen} / 3000
          </span>
        </div>
        <AnnouncementRichEditor
          id='content'
          value={content}
          onChange={(html) => {
            onContentChange(html);
            if (errors.content) onClearContentError();
          }}
          placeholder='Write your announcement…'
          aria-invalid={!!errors.content}
          aria-describedby='content-counter content-readability'
        />
        {readability ? (
          <p
            id='content-readability'
            aria-live='polite'
            className={cn('flex items-center gap-1.5 text-[11px]', tone)}
          >
            <Icons.info className='size-3' aria-hidden />
            Reading ease {readability.score} · {readability.grade}
          </p>
        ) : null}
        {errors.content ? <p className='text-xs text-destructive'>{errors.content}</p> : null}
      </div>

      <div className='space-y-2'>
        <Label className='text-xs font-medium text-foreground'>
          Images <span className='font-normal text-muted-foreground'>· optional</span>
        </Label>
        <div className='rounded-2xl border border-dashed border-border bg-muted/30 p-4'>
          <div className='mb-3 flex items-center gap-2 text-xs text-muted-foreground'>
            <Icons.photoPlus className='size-4' aria-hidden />
            Drag and drop, or click to browse
          </div>
          <ImagePicker images={images} onImagesChange={onImagesChange} maxImages={10} />
        </div>
      </div>
    </>
  );
}
