'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type RecordingMode = 'audio' | 'video';
export type RecorderState = 'idle' | 'requesting' | 'recording' | 'paused' | 'stopped';

export interface RecordedBlob {
  blob: Blob;
  mimeType: string;
  url: string; // Object URL — revoke when done.
  durationMs: number;
}

export interface UseMediaRecorderReturn {
  state: RecorderState;
  elapsedMs: number;
  recorded: RecordedBlob | null;
  previewRef: React.RefObject<HTMLVideoElement | null>; // live preview during video recording
  error: string | null;
  start: (mode: RecordingMode) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  discard: () => void;
}

/// Pick the best supported mime type for the given mode. We prefer formats
/// that are widely supported in browsers and handled by the upload endpoint's
/// ALLOWED_MIME_PREFIXES (`audio/`, `video/`).
function pickMime(mode: RecordingMode): string {
  const candidates =
    mode === 'audio'
      ? ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
      : [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm',
          'video/mp4'
        ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

export function useMediaRecorder(): UseMediaRecorderReturn {
  const [state, setState] = useState<RecorderState>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [recorded, setRecorded] = useState<RecordedBlob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedAtPauseRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);

  // Clean up the stream + timer on unmount.
  useEffect(() => {
    return () => {
      cleanupStream();
      stopTick();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const cleanupStream = () => {
    stopTick();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (previewRef.current) {
      previewRef.current.srcObject = null;
    }
  };

  const startTick = (baseMs: number) => {
    startTimeRef.current = Date.now();
    tickRef.current = setInterval(() => {
      setElapsedMs(baseMs + (Date.now() - startTimeRef.current));
    }, 200);
  };

  const start = useCallback(async (mode: RecordingMode) => {
    setError(null);
    setRecorded(null);
    setElapsedMs(0);
    elapsedAtPauseRef.current = 0;
    chunksRef.current = [];
    setState('requesting');

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(
        mode === 'audio'
          ? { audio: true }
          : { audio: true, video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } }
      );
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone / camera access was denied. Check your browser permissions.'
          : err instanceof DOMException && err.name === 'NotFoundError'
            ? `No ${mode === 'audio' ? 'microphone' : 'camera'} found on this device.`
            : `Could not access ${mode}: ${(err as Error).message}`;
      setError(msg);
      setState('idle');
      return;
    }

    streamRef.current = stream;

    // Attach live preview for video mode.
    if (mode === 'video' && previewRef.current) {
      previewRef.current.srcObject = stream;
      previewRef.current.muted = true;
      previewRef.current.play().catch(() => {/* swallow autoplay block */});
    }

    const mimeType = pickMime(mode);
    const mr = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mr.onstop = () => {
      const finalMime = mr.mimeType || (mode === 'audio' ? 'audio/webm' : 'video/webm');
      const blob = new Blob(chunksRef.current, { type: finalMime });
      const url = URL.createObjectURL(blob);
      setRecorded({
        blob,
        mimeType: finalMime,
        url,
        durationMs: elapsedAtPauseRef.current || elapsedMs
      });
      cleanupStream();
      setState('stopped');
    };

    mr.start(250); // 250 ms timeslice so ondataavailable fires frequently
    mediaRecorderRef.current = mr;
    startTick(0);
    setState('recording');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pause = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      elapsedAtPauseRef.current += Date.now() - startTimeRef.current;
      stopTick();
      setState('paused');
    }
  }, []);

  const resume = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      startTick(elapsedAtPauseRef.current);
      setState('recording');
    }
  }, []);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Capture elapsed before onstop fires.
      elapsedAtPauseRef.current += Date.now() - startTimeRef.current;
      stopTick();
      mediaRecorderRef.current.stop();
    }
  }, []);

  const discard = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recorded?.url) URL.revokeObjectURL(recorded.url);
    cleanupStream();
    setRecorded(null);
    setElapsedMs(0);
    elapsedAtPauseRef.current = 0;
    chunksRef.current = [];
    setState('idle');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorded]);

  return { state, elapsedMs, recorded, previewRef, error, start, pause, resume, stop, discard };
}

/// Format milliseconds as `m:ss` (e.g. `1:05`).
export function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
