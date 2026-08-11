import { useEffect } from 'react';
import {
  getMyResourceProgress,
  recordResourceProgress
} from '@/lib/course-details/services/resources-service';
import { HEARTBEAT_MS, SEEK_THRESHOLD_SEC } from './constants';

export function useTrackedMedia(
  resourceId: number,
  url: string,
  track: boolean,
  mediaRef: React.RefObject<HTMLVideoElement | HTMLAudioElement | null>
) {
  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;

    let disposed = false;
    const pendingRef = { current: 0 };
    const lastTimeRef = { current: 0 };
    const durationRef = { current: 0 };
    const startedSentRef = { current: false };

    if (track) {
      getMyResourceProgress(resourceId)
        .then((p) => {
          if (disposed || !p) return;
          if (
            p.lastPositionSeconds > 3 &&
            (p.durationSeconds === 0 || p.lastPositionSeconds < p.durationSeconds - 5)
          ) {
            try {
              el.currentTime = p.lastPositionSeconds;
              lastTimeRef.current = p.lastPositionSeconds;
            } catch {
              /* ignore */
            }
          }
        })
        .catch(() => {});
    }

    const flush = (opts: { started?: boolean; ended?: boolean } = {}) => {
      if (!track) return;
      const delta = pendingRef.current;
      const markStart = opts.started === true;
      const markEnd = opts.ended === true;
      if (delta <= 0 && !markStart && !markEnd) return;
      pendingRef.current = 0;
      recordResourceProgress(resourceId, {
        watchedDelta: delta,
        position: Math.round(el.currentTime || 0),
        duration: Math.round(durationRef.current || el.duration || 0),
        started: markStart,
        ended: markEnd
      }).catch(() => {});
    };

    const onLoadedMetadata = () => {
      if (Number.isFinite(el.duration)) durationRef.current = el.duration;
    };
    const onPlay = () => {
      lastTimeRef.current = el.currentTime;
      if (!startedSentRef.current && el.currentTime < 5) {
        startedSentRef.current = true;
        flush({ started: true });
      }
    };
    const onTimeUpdate = () => {
      const now = el.currentTime;
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;
      if (delta > 0 && delta < SEEK_THRESHOLD_SEC) {
        pendingRef.current += delta;
      }
    };
    const onPause = () => flush();
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
      flush();
    };
  }, [resourceId, url, track, mediaRef]);
}
