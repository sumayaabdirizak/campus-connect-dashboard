'use client';

import { cn } from '@/lib/utils';

export type AttachmentCardModel = {
  id: number;
  url?: string;
  accessUrl?: string;
  fileType: string;
  mimeType?: string;
  size?: number;
  isE2EE?: boolean;
};

function typeIconLabel(fileType: string): { label: string; className: string } {
  const u = String(fileType || '').toUpperCase();
  if (u === 'IMAGE') return { label: 'IMG', className: 'text-emerald-200 ring-emerald-500/30' };
  if (u === 'VIDEO') return { label: 'VID', className: 'text-violet-200 ring-violet-500/35' };
  return { label: 'FILE', className: 'text-rose-200 ring-rose-500/30' };
}

function fileNameFromUrl(url: string): string {
  try {
    const u = new URL(url, 'http://local');
    const seg = u.pathname.split('/').pop() || 'file';
    return decodeURIComponent(seg);
  } catch {
    return 'file';
  }
}

function formatSize(n?: number | null): string {
  if (n == null || !Number.isFinite(n) || n < 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

type Tone = 'hybrid' | 'legacy';

export function DiscussionAttachmentCards({
  attachments,
  tone
}: {
  attachments: AttachmentCardModel[];
  tone: Tone;
}) {
  if (attachments.length === 0) return null;
  const isHybrid = tone === 'hybrid';

  return (
    <div className='mt-2 flex w-full max-w-full flex-col gap-1.5'>
      {attachments.map((att) => {
        const href = att.accessUrl || att.url;
        const name = fileNameFromUrl(att.url || '');
        const { label, className: iconClass } = typeIconLabel(att.fileType);
        const isImage = String(att.fileType).toUpperCase() === 'IMAGE' && (att.mimeType || '').startsWith('image/');
        const e2 = att.isE2EE
          ? isHybrid
            ? ' · E2EE'
            : ' · E2EE'
          : '';
        return (
          <a
            key={att.id}
            href={href || '#'}
            target='_blank'
            rel='noreferrer'
            onClick={(e) => {
              if (!href) e.preventDefault();
            }}
            className={cn(
              'block max-w-md overflow-hidden rounded-lg border text-left transition',
              isHybrid
                ? 'border-border/80 bg-muted/30 hover:border-violet-500/35 hover:bg-muted/50'
                : 'border-zinc-700/90 bg-zinc-900/50 hover:border-[#7c4dff]/40'
            )}
          >
            {isImage && href ? (
              <div
                className={cn(
                  'relative flex max-h-40 w-full items-center justify-center overflow-hidden border-b',
                  isHybrid ? 'border-border/60 bg-black/20' : 'border-zinc-800 bg-zinc-950/80'
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={href} alt='' className='max-h-40 w-full object-cover' />
              </div>
            ) : null}
            <div className='flex items-center gap-2.5 px-2.5 py-2'>
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded text-[9px] font-bold ring-1',
                  isHybrid ? 'bg-background/80' : 'bg-zinc-800',
                  iconClass
                )}
              >
                {label}
              </span>
              <div className='min-w-0 flex-1'>
                <div
                  className={cn(
                    'truncate text-xs font-semibold',
                    isHybrid ? 'text-foreground' : 'text-zinc-100'
                  )}
                >
                  {name}
                </div>
                <div className='text-[10px] text-muted-foreground dark:text-zinc-500'>
                  {formatSize(att.size)}
                  {href ? ' · Click to view' : ''}
                  {e2}
                </div>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
