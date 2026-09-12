'use client';

import {
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Loader2,
  Paperclip
} from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  chatFileExtension,
  chatFileKind,
  type DisplayChatFile
} from './chat-file-utils';

function FileKindIcon({ kind, className }: { kind: ReturnType<typeof chatFileKind>; className?: string }) {
  const props = { className: cn('size-5', className), 'aria-hidden': true as const };
  switch (kind) {
    case 'image':
      return <FileImage {...props} />;
    case 'pdf':
      return <FileText {...props} />;
    case 'video':
      return <FileVideo {...props} />;
    case 'audio':
      return <FileAudio {...props} />;
    default:
      return <Paperclip {...props} />;
  }
}

const KIND_TONE: Record<ReturnType<typeof chatFileKind>, string> = {
  image: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  pdf: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  video: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
  audio: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  file: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
};

export function ChatFileCard({
  file,
  isOwn
}: {
  file: DisplayChatFile;
  isOwn: boolean;
}) {
  const kind = chatFileKind(file.name, file.mimeType);
  const ext = chatFileExtension(file.name);
  const isImage = kind === 'image';
  const preview = file.previewUrl ?? (isImage && file.url ? file.url : null);

  const shell = cn(
    'block w-full max-w-[280px] overflow-hidden rounded-lg border text-left transition-colors',
    isOwn
      ? 'border-white/25 bg-white text-[#101828] shadow-sm hover:bg-white/95 dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted/40'
      : 'border-[#E5E7EB] bg-white text-[#101828] hover:bg-[#F9FAFB] dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted/40'
  );

  const inner = (
    <>
      {preview ? (
        <div className='relative bg-[#F2F4F7] dark:bg-muted/30'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt={file.name}
            className='max-h-44 w-full object-cover'
          />
        </div>
      ) : null}
      <div className='flex items-center gap-3 p-3'>
        <span
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-lg',
            KIND_TONE[kind]
          )}
        >
          {file.pending ? (
            <Loader2 className='size-5 animate-spin' aria-hidden />
          ) : (
            <FileKindIcon kind={kind} />
          )}
        </span>
        <div className='min-w-0 flex-1'>
          <p className='truncate text-sm font-medium leading-tight'>{file.name}</p>
          <p className='mt-0.5 text-xs text-[#667085] dark:text-muted-foreground'>
            {file.pending
              ? 'Uploading…'
              : typeof file.size === 'number'
                ? formatBytes(file.size, { decimals: 1 })
                : ext}
          </p>
        </div>
        {!file.pending ? (
          <span className='shrink-0 rounded-md bg-[#F2F4F7] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#667085] dark:bg-muted dark:text-muted-foreground'>
            {ext}
          </span>
        ) : null}
      </div>
    </>
  );

  if (file.pending || !file.url) {
    return <div className={shell}>{inner}</div>;
  }

  return (
    <a
      href={file.url}
      target='_blank'
      rel='noreferrer'
      download={file.name}
      className={shell}
      title={`Download ${file.name}`}
    >
      {inner}
    </a>
  );
}
