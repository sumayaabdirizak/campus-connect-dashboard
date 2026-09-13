import { Badge } from '@/features/ui/components/badge';
import { Link as LinkIcon, Music } from 'lucide-react';
import { isYoutubeUrl, toYoutubeEmbed } from './media-helpers';

export function VideoRenderer({ url, title }: { url: string; title: string }) {
  if (isYoutubeUrl(url)) {
    return (
      <div className='aspect-video rounded-lg overflow-hidden border'>
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
      className='flex items-center justify-between gap-3 rounded-xl border-2 border-border bg-card p-4 hover:border-primary/30 hover:bg-primary/5'
    >
      <div className='flex min-w-0 items-center gap-3'>
        <div className='flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10'>
          <LinkIcon className='size-6 text-primary' />
        </div>
        <div className='min-w-0'>
          <p className='truncate text-base font-semibold text-foreground'>{title}</p>
          <p className='truncate text-sm font-medium text-muted-foreground'>{host}</p>
        </div>
      </div>
      <Badge variant='outline' className='shrink-0 rounded-full border-border'>
        Open link
      </Badge>
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
      <audio src={url} controls className='w-full' aria-label={title} preload='metadata' />
    </div>
  );
}
