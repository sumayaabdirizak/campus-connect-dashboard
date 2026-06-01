'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Download, Music } from 'lucide-react';
import {
  getMyResourceProgress,
  recordResourceProgress
} from '../api/resources-service';

interface TrackedMediaPlayerProps {
  resourceId: number;
  url: string;
  title: string;
  kind: 'video' | 'audio';
  /// When false (teacher preview), we render the player but never report
  /// progress — only enrolled students should populate analytics. The backend
  /// also no-ops non-students, so this is belt-and-suspenders.
  track?: boolean;
  /// Whether the audio variant draws its own title header. Defaults true; the
  /// module list already renders the title above the player, so it passes
  /// false there to avoid showing it twice.
  showTitle?: boolean;
}

/// How often we flush accumulated watch time to the server while playing.
const HEARTBEAT_MS = 15_000;
/// `timeupdate` fires ~4×/sec. A normal tick advances currentTime by a small
/// amount; a jump larger than this means the user seeked, so we don't count
/// the gap as "watched".
const SEEK_THRESHOLD_SEC = 2;

/**
 * A `<video>` / `<audio>` player that measures how much a student actually
 * watches and reports it to the resource analytics endpoint.
 *
 * Watch accounting: on each `timeupdate` we add the delta since the previous
 * tick to an accumulator — but only when the delta is small and positive
 * (real playback). Seeking forward produces a large delta we ignore; seeking
 * back produces a negative delta we ignore. The accumulator is flushed to the
 * server on a 15s heartbeat and on pause / ended / unmount, then reset. This
 * means fast-forwarding through a video never inflates the watched total.
 *
 * On mount we fetch the student's saved position and resume there.
 */
export function TrackedMediaPlayer({
  resourceId,
  url,
  title,
  kind,
  track = true,
  showTitle = true
}: TrackedMediaPlayerProps) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  // Set when the media element can't load its source — turns the otherwise
  // silent black box into a recoverable "download instead" message.
  const [failed, setFailed] = useState(false);

  // Accumulated, not-yet-flushed seconds of real playback.
  const pendingRef = useRef(0);
  // currentTime at the previous timeupdate tick.
  const lastTimeRef = useRef(0);
  // Latest known duration (seconds) — reported with each beat.
  const durationRef = useRef(0);
  // Set true once we've counted a fresh play from the start (bumps viewCount).
  const startedSentRef = useRef(false);

  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;

    let disposed = false;

    // ── Resume from saved position ──────────────────────────────────────────
    if (track) {
      getMyResourceProgress(resourceId)
        .then((p) => {
          if (disposed || !p) return;
          // Don't resume if they basically finished — let it start fresh.
          if (
            p.lastPositionSeconds > 3 &&
            (p.durationSeconds === 0 || p.lastPositionSeconds < p.durationSeconds - 5)
          ) {
            try {
              el.currentTime = p.lastPositionSeconds;
              lastTimeRef.current = p.lastPositionSeconds;
            } catch {
              /* setting currentTime before metadata can throw — ignore */
            }
          }
        })
        .catch(() => {
          /* resume is best-effort */
        });
    }

    // ── Flush helper ────────────────────────────────────────────────────────
    const flush = (opts: { started?: boolean; ended?: boolean } = {}) => {
      if (!track) return;
      const delta = pendingRef.current;
      const markStart = opts.started === true;
      const markEnd = opts.ended === true;
      // Nothing new to report unless this is a start / end signal.
      if (delta <= 0 && !markStart && !markEnd) return;
      pendingRef.current = 0;
      recordResourceProgress(resourceId, {
        watchedDelta: delta,
        position: Math.round(el.currentTime || 0),
        duration: Math.round(durationRef.current || el.duration || 0),
        started: markStart,
        ended: markEnd
      }).catch(() => {
        /* a dropped beat is fine — next one carries the new delta */
      });
    };

    // ── Event handlers ──────────────────────────────────────────────────────
    const onLoadedMetadata = () => {
      if (Number.isFinite(el.duration)) durationRef.current = el.duration;
    };

    const onPlay = () => {
      lastTimeRef.current = el.currentTime;
      // Count a fresh session the first time playback starts near the top.
      if (!startedSentRef.current && el.currentTime < 5) {
        startedSentRef.current = true;
        flush({ started: true });
      }
    };

    const onTimeUpdate = () => {
      const now = el.currentTime;
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;
      // Only real, forward playback counts (ignore seeks in either direction).
      if (delta > 0 && delta < SEEK_THRESHOLD_SEC) {
        pendingRef.current += delta;
      }
    };

    const onPause = () => flush();
    // Playing through to the end is the clearest "completed" signal — report it
    // explicitly so the server marks completion even if accumulated watch time
    // landed a hair under the 90% threshold.
    const onEnded = () => flush({ ended: true });

    el.addEventListener('loadedmetadata', onLoadedMetadata);
    el.addEventListener('play', onPlay);
    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnded);

    const interval = track ? window.setInterval(() => flush(), HEARTBEAT_MS) : undefined;

    return () => {
      disposed = true;
      if (interval) window.clearInterval(interval);
      el.removeEventListener('loadedmetadata', onLoadedMetadata);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnded);
      // Final flush of whatever's left when the player closes.
      flush();
    };
    // resourceId / url identify the media; track toggles reporting. Re-running
    // on any of these tears down and rebuilds the listeners cleanly.
  }, [resourceId, url, track]);

  if (failed) {
    return (
      <div className='border rounded-lg p-4 flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2 min-w-0 text-sm text-muted-foreground'>
          <AlertTriangle className='w-4 h-4 text-amber-500 shrink-0' />
          <span className='truncate'>This {kind} couldn’t be played.</span>
        </div>
        <a
          href={url}
          className='inline-flex items-center gap-1 text-sm border rounded-md px-3 py-1.5 hover:bg-muted/30 shrink-0'
          aria-label={`Download ${title}`}
        >
          <Download className='w-4 h-4' />
          <span className='hidden sm:inline'>Download</span>
        </a>
      </div>
    );
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
