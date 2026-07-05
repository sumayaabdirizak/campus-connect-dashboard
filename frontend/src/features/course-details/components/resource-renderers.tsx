'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Download,
  Edit,
  Trash2,
  Link as LinkIcon,
  Video as VideoIcon,
  Image as ImageIcon,
  FileArchive,
  FileSpreadsheet,
  FileType2,
  FileCode2,
  Music
} from 'lucide-react';
import { format } from 'date-fns';
import { resourceDownloadUrl } from '../api/resources-service';
import type { Resource } from '../api/resources-types';

// ─── URL helpers ───────────────────────────────────────────────────────────

function isYoutubeUrl(url: string) {
  return /(?:youtube\.com\/watch|youtu\.be\/)/i.test(url);
}

function toYoutubeEmbed(url: string) {
  const watch = url.match(/[?&]v=([\w-]+)/);
  if (watch) return `https://www.youtube.com/embed/${watch[1]}`;
  const short = url.match(/youtu\.be\/([\w-]+)/);
  if (short) return `https://www.youtube.com/embed/${short[1]}`;
  return url;
}

export function isAudio(resource: Resource) {
  return (
    resource.type === 'AUDIO' ||
    (resource.mimeType ?? '').startsWith('audio/') ||
    /\.(mp3|wav|ogg|flac|aac|m4a)$/i.test(resource.url)
  );
}

/// True for an UPLOADED video file we can play + track inline. We deliberately
/// exclude YouTube / external links here — those open out and can't report
/// watch progress through the native <video> element.
export function isUploadedVideo(resource: Resource) {
  return (
    !!resource.originalName &&
    (resource.type === 'VIDEO' ||
      (resource.mimeType ?? '').startsWith('video/') ||
      /\.(mp4|mov|mkv|webm)$/i.test(resource.url))
  );
}

/// True for an uploaded audio file we can play + track inline.
export function isUploadedAudio(resource: Resource) {
  return !!resource.originalName && isAudio(resource);
}

/// Either uploaded audio or video — i.e. something the TrackedMediaPlayer can
/// render and report watch analytics for.
export function isTrackableMedia(resource: Resource) {
  return isUploadedVideo(resource) || isUploadedAudio(resource);
}

/// Pick the right icon for a file based on its mime. We previously rendered
/// every file with a generic `FileText`, which made the list visually flat —
/// a quick glance now distinguishes PDFs from slide decks from zips.
export function MimeIcon({ mime, className = 'w-8 h-8 text-muted-foreground shrink-0' }: {
  mime: string | null | undefined;
  className?: string;
}) {
  const m = (mime ?? '').toLowerCase();
  if (m.startsWith('image/')) return <ImageIcon className={className} />;
  if (m.startsWith('audio/')) return <Music className={className} />;
  if (m.startsWith('video/')) return <VideoIcon className={className} />;
  if (m.includes('pdf')) return <FileType2 className={className} />;
  if (m.includes('zip') || m.includes('compressed') || m.includes('rar') || m.includes('7z'))
    return <FileArchive className={className} />;
  if (m.includes('sheet') || m.includes('excel') || m.includes('csv'))
    return <FileSpreadsheet className={className} />;
  if (m.includes('javascript') || m.includes('json') || m.includes('xml') || m.includes('html'))
    return <FileCode2 className={className} />;
  return <FileText className={className} />;
}

// ─── Renderers ─────────────────────────────────────────────────────────────

export function VideoRenderer({ url, title }: { url: string; title: string }) {
  if (isYoutubeUrl(url)) {
    return (
      <div className='aspect-video rounded-lg overflow-hidden border'>
        {/* `title` is required for screen-reader users navigating the iframe. */}
        <iframe
          src={toYoutubeEmbed(url)}
          title={title}
          className='w-full h-full'
          allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <video controls className='w-full rounded-lg border' preload='metadata' aria-label={title}>
      <source src={url} />
    </video>
  );
}

export function LinkRenderer({ url, title }: { url: string; title: string }) {
  let host = '';
  try {
    host = new URL(url).host;
  } catch {
    host = url;
  }
  return (
    <a
      href={url}
      target='_blank'
      rel='noreferrer'
      className='flex items-center justify-between gap-3 p-3 border rounded-lg hover:bg-muted/30'
    >
      <div className='flex items-center gap-3 min-w-0'>
        <LinkIcon className='w-5 h-5 text-muted-foreground shrink-0' />
        <div className='min-w-0'>
          <p className='font-medium truncate'>{title}</p>
          <p className='text-xs text-muted-foreground truncate'>{host}</p>
        </div>
      </div>
      <Badge variant='outline'>Link</Badge>
    </a>
  );
}

export function AudioRenderer({ url, title }: { url: string; title: string }) {
  return (
    <div className='border rounded-lg p-3 space-y-2'>
      <div className='flex items-center gap-2'>
        <Music className='w-4 h-4 text-muted-foreground shrink-0' />
        <p className='text-sm font-medium truncate'>{title}</p>
      </div>
      <audio
        src={url}
        controls
        className='w-full'
        aria-label={title}
        preload='metadata'
      />
    </div>
  );
}

export interface ResourceCardProps {
  resource: Resource;
  isStudent?: boolean;
  onEdit?: (r: Resource) => void;
  onDelete?: (id: number) => void;
  /// Optional drag handle slot (provided by the sortable wrapper). Hidden
  /// for students — drag-reorder is teacher-only.
  dragHandle?: React.ReactNode;
}

export function ResourceCard({
  resource,
  isStudent,
  onEdit,
  onDelete,
  dragHandle
}: ResourceCardProps) {
  const isUploaded = !!resource.originalName;
  const downloadHref = isUploaded ? resourceDownloadUrl(resource.id) : resource.url;
  return (
    <div className='border rounded-lg p-4 flex items-center justify-between gap-3'>
      <div className='flex items-center gap-3 min-w-0'>
        {dragHandle}
        <MimeIcon mime={resource.mimeType} />
        <div className='min-w-0'>
          <p className='font-medium truncate flex items-center gap-2'>
            {resource.title}
            {resource.is_draft && (
              <Badge variant='outline' className='text-[10px]'>
                Draft
              </Badge>
            )}
          </p>
          <p className='text-xs text-muted-foreground'>
            {humanizeType(resource.type)} ·{' '}
            {format(new Date(resource.created_at), 'MMM d, yyyy')}
            {resource.teacher?.full_name ? ` · ${resource.teacher.full_name}` : ''}
            {resource.originalName ? ` · ${resource.originalName}` : ''}
          </p>
          {resource.description && (
            <p className='text-xs text-muted-foreground mt-1 line-clamp-2'>
              {resource.description}
            </p>
          )}
        </div>
      </div>
      <div className='flex gap-1 shrink-0'>
        <a
          href={downloadHref}
          {...(isUploaded ? { download: resource.originalName ?? true } : { target: '_blank', rel: 'noreferrer' })}
          className='inline-flex items-center gap-1 text-sm border rounded-md px-3 py-1.5 hover:bg-muted/30'
          aria-label={`Download ${resource.title}`}
        >
          <Download className='w-4 h-4' />
          <span className='hidden sm:inline'>Download</span>
        </a>
        {!isStudent && onEdit && (
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            onClick={() => onEdit(resource)}
            aria-label={`Edit ${resource.title}`}
          >
            <Edit className='w-3.5 h-3.5' />
          </Button>
        )}
        {!isStudent && onDelete && (
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8 text-destructive'
            onClick={() => onDelete(resource.id)}
            aria-label={`Delete ${resource.title}`}
          >
            <Trash2 className='w-3.5 h-3.5' />
          </Button>
        )}
      </div>
    </div>
  );
}

/// Turns enum tokens into the title-cased labels we show in the UI. We render
/// these in headers / chips / filters, so a single helper keeps the casing
/// consistent (avoids `LECTURE NOTE` vs `Lecture Note` drift).
export function humanizeType(type: Resource['type']): string {
  switch (type) {
    case 'SYLLABUS':
      return 'Syllabus';
    case 'ASSIGNMENT':
      return 'Assignment';
    case 'LECTURE_NOTE':
      return 'Lecture Note';
    case 'VIDEO':
      return 'Video';
    case 'AUDIO':
      return 'Audio';
    case 'EXTERNAL_LINK':
      return 'External Link';
    case 'OTHER':
      return 'Other';
    default:
      return type;
  }
}
