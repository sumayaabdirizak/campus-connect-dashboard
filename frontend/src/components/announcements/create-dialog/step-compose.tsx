'use client';

import { Input } from '@/features/ui/components/input';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { AnnouncementRichEditor, computeReadability } from '../announcement-rich-editor';
import { ImagePicker } from '../image-picker';
import type { ImageFile } from './types';
import {
  dialogFieldsetClass,
  dialogHintClass,
  dialogInputClass,
  dialogLabelClass,
  htmlToPlain,
} from './utils';

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
      ? 'text-emerald-700 dark:text-emerald-400'
      : readability.score >= 40
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-destructive';

  return (
    <div className='space-y-4'>
      <fieldset className={dialogFieldsetClass}>
        <legend className={dialogLabelClass}>Title</legend>
        <p className={dialogHintClass}>A short headline students and staff will see first.</p>
        <Input
          id='title'
          value={title}
          onChange={(e) => {
            onTitleChange(e.target.value);
            if (errors.title) onClearTitleError();
          }}
          placeholder='e.g. Midterm exam schedule update'
          aria-invalid={!!errors.title}
          className={dialogInputClass}
        />
        {errors.title ? <p className='text-xs font-medium text-destructive'>{errors.title}</p> : null}
      </fieldset>

      <fieldset className={dialogFieldsetClass}>
        <div className='flex items-center justify-between gap-2'>
          <legend className={dialogLabelClass}>Message</legend>
          <span
            id='content-counter'
            aria-live='polite'
            className={cn(
              'text-xs tabular-nums',
              plainLen > 3000 ? 'font-semibold text-destructive' : 'text-muted-foreground',
            )}
          >
            {plainLen} / 3000
          </span>
        </div>
        <p className={dialogHintClass}>Write the full announcement. You can use bold, lists, and links.</p>
        <AnnouncementRichEditor
          id='content'
          value={content}
          onChange={(html) => {
            onContentChange(html);
            if (errors.content) onClearContentError();
          }}
          placeholder='What do people need to know?'
          aria-invalid={!!errors.content}
          aria-describedby='content-counter content-readability'
        />
        {readability ? (
          <p
            id='content-readability'
            aria-live='polite'
            className={cn('flex items-center gap-1.5 text-xs', tone)}
          >
            <Icons.info className='size-3.5 shrink-0' aria-hidden />
            Reading ease {readability.score} · {readability.grade}
          </p>
        ) : null}
        {errors.content ? (
          <p className='text-xs font-medium text-destructive'>{errors.content}</p>
        ) : null}
      </fieldset>

      <fieldset className={dialogFieldsetClass}>
        <legend className={dialogLabelClass}>
          Images <span className='font-normal text-muted-foreground'>· optional</span>
        </legend>
        <p className={dialogHintClass}>Add up to 10 images. Drag and drop or click to browse.</p>
        <div className='rounded-lg border-2 border-dashed border-foreground/15 bg-background p-4'>
          <ImagePicker images={images} onImagesChange={onImagesChange} maxImages={10} />
        </div>
      </fieldset>
    </div>
  );
}
