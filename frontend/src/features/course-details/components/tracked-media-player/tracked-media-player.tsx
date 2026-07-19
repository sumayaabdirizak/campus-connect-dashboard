'use client';

import { useRef, useState } from 'react';
import { Music } from 'lucide-react';
import { useTrackedMedia } from './use-tracked-media';
import { MediaPlayerFallback } from './player-fallback';

interface TrackedMediaPlayerProps {
  resourceId: number;
  url: string;
  title: string;
  kind: 'video' | 'audio';
  track?: boolean;
  showTitle?: boolean;
}

export function TrackedMediaPlayer({
  resourceId,
  url,
  title,
  kind,
  track = true,
  showTitle = true
}: TrackedMediaPlayerProps) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [failed, setFailed] = useState(false);

  useTrackedMedia(resourceId, url, track, mediaRef);

  if (failed) {
    return <MediaPlayerFallback kind={kind} title={title} url={url} />;
  }

  if (kind === 'audio') {
    return (
      <div className='border rounded-lg p-3 space-y-2'>
        {showTitle && (
          <div className='flex items-center gap-2'>
            <Music className='w-4 h-4 text-muted-foreground shrink-0' />
            <p className='text-sm font-medium truncate'>{title}</p>
          </div>
        )}
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          src={url}
          controls
          className='w-full'
          aria-label={title}
          preload='metadata'
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <video
      ref={mediaRef as React.RefObject<HTMLVideoElement>}
      src={url}
      controls
      className='w-full rounded-lg border'
      preload='metadata'
      aria-label={title}
      onError={() => setFailed(true)}
    />
  );
}
