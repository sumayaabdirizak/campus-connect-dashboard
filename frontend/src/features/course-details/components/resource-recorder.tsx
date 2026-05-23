'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, Video, Square, Pause, Play, Trash2, Upload, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaRecorder, formatDuration, type RecordingMode } from '../hooks/use-media-recorder';
import type { UploadResourceFileResult } from '../api/resources-types';

interface ResourceRecorderProps {
  /// Called after a successful upload so the parent can populate the form
  /// with the returned URL / mime / originalName — same shape as file-upload.
  onUploaded: (result: UploadResourceFileResult & { mode: RecordingMode }) => void;
  onUploadError: (msg: string) => void;
  /// Controlled uploading state from the parent (e.g. `uploadMutation.isPending`).
  uploading?: boolean;
  uploadFn: (file: File) => Promise<UploadResourceFileResult>;
}

/**
 * In-browser audio/video recorder for the Add Material dialog.
 *
 * UI states:
 *   idle       → two "Record audio" / "Record video" buttons
 *   requesting → spinner while getUserMedia resolves
 *   recording  → live timer + waveform badge + Pause / Stop
 *   paused     → timer frozen + Resume / Stop
 *   stopped    → playback preview + "Use this" upload / Discard
 *
 * The component does NOT manage the upload mutation — it calls `uploadFn`
 * (passed from the parent) so the parent's `isPending` state drives the
 * button spinner without extra prop drilling.
 *
 * For video recording, a live `<video>` preview is shown via `previewRef`.
 * After stopping, the preview switches to the recorded blob's object URL.
 */
export function ResourceRecorder({
  onUploaded,
  onUploadError,
  uploading,
  uploadFn
}: ResourceRecorderProps) {
  const { state, elapsedMs, recorded, previewRef, error, start, pause, resume, stop, discard } =
    useMediaRecorder();

  const modeRef = useRef<RecordingMode>('audio');

  const handleStart = (mode: RecordingMode) => {
    modeRef.current = mode;
    start(mode);
  };

  const handleUse = async () => {
    if (!recorded) return;
    // Turn the blob into a File so the existing upload endpoint handles it.
    const ext = recorded.mimeType.includes('mp4')
      ? 'mp4'
      : recorded.mimeType.startsWith('audio')
        ? 'webm'
        : 'webm';
    const now = new Date();
    const stamp = `${now.toISOString().slice(0, 10)}-${now.getHours()}h${now.getMinutes()
      .toString()
      .padStart(2, '0')}`;
    const name =
      modeRef.current === 'audio'
        ? `voice-note-${stamp}.${ext}`
        : `video-recording-${stamp}.${ext}`;
    const file = new File([recorded.blob], name, { type: recorded.mimeType });
    try {
      const result = await uploadFn(file);
      // Revoke the object URL now that the file is on the server.
      URL.revokeObjectURL(recorded.url);
      onUploaded({ ...result, mode: modeRef.current });
      discard(); // reset the recorder for reuse
    } catch (err) {
      onUploadError((err as Error).message || 'Upload failed');
    }
  };

  // ── idle ───────────────────────────────────────────────────────────────────
  if (state === 'idle') {
    return (
      <div className='flex gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='flex-1 gap-1.5'
          onClick={() => handleStart('audio')}
        >
          <Mic className='w-4 h-4' />
          Record audio
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='flex-1 gap-1.5'
          onClick={() => handleStart('video')}
        >
          <Video className='w-4 h-4' />
          Record video
        </Button>
      </div>
    );
  }

  // ── requesting permission ──────────────────────────────────────────────────
  if (state === 'requesting') {
    return (
      <div className='flex items-center gap-2 text-sm text-muted-foreground border rounded-lg p-3'>
        <span className='animate-spin'>⏳</span>
        Waiting for permission…
      </div>
    );
  }

  // ── permission error ───────────────────────────────────────────────────────
  if (error) {
    return (
      <div className='flex items-start gap-2 border border-destructive/40 rounded-lg p-3 text-sm text-destructive'>
        <AlertCircle className='w-4 h-4 mt-0.5 shrink-0' />
        <span>{error}</span>
      </div>
    );
  }

  // ── stopped — show playback + upload actions ───────────────────────────────
  if (state === 'stopped' && recorded) {
    const isVideo = modeRef.current === 'video';
    return (
      <div className='space-y-2 border rounded-lg p-3'>
        <div className='flex items-center justify-between gap-2'>
          <p className='text-sm font-medium'>
            {isVideo ? 'Video' : 'Voice note'} ·{' '}
            <span className='text-muted-foreground font-normal'>
              {formatDuration(recorded.durationMs)}
            </span>
          </p>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='h-7 w-7 text-muted-foreground'
            onClick={discard}
          >
            <Trash2 className='w-3.5 h-3.5' />
          </Button>
        </div>
        {isVideo ? (
          <video
            src={recorded.url}
            controls
            className='w-full rounded-md border max-h-48 object-contain bg-black'
          />
        ) : (
          <audio src={recorded.url} controls className='w-full' />
        )}
        <Button
          type='button'
          size='sm'
          className='w-full gap-1.5'
          onClick={handleUse}
          disabled={uploading}
        >
          <Upload className='w-4 h-4' />
          {uploading ? 'Uploading…' : 'Use this recording'}
        </Button>
      </div>
    );
  }

  // ── recording / paused ────────────────────────────────────────────────────
  const isVideo = modeRef.current === 'video';
  const isRecording = state === 'recording';

  return (
    <div className='space-y-2 border rounded-lg p-3'>
      {/* Live video preview */}
      {isVideo && (
        <div className='relative rounded-md overflow-hidden bg-black aspect-video'>
          <video
            ref={previewRef as React.RefObject<HTMLVideoElement>}
            autoPlay
            muted
            playsInline
            className='w-full h-full object-cover'
          />
          <Badge
            variant='destructive'
            className={cn(
              'absolute top-2 left-2 gap-1 text-[10px]',
              !isRecording && 'opacity-60'
            )}
          >
            <span
              className={cn('w-1.5 h-1.5 rounded-full bg-white', isRecording && 'animate-pulse')}
            />
            {isRecording ? 'REC' : 'PAUSED'}
          </Badge>
        </div>
      )}

      {/* Audio-only indicator */}
      {!isVideo && (
        <div className='flex items-center gap-2'>
          <Badge
            variant='destructive'
            className={cn('gap-1 text-[10px]', !isRecording && 'opacity-60')}
          >
            <span
              className={cn('w-1.5 h-1.5 rounded-full bg-white', isRecording && 'animate-pulse')}
            />
            {isRecording ? 'REC' : 'PAUSED'}
          </Badge>
          <Mic
            className={cn(
              'w-4 h-4',
              isRecording ? 'text-destructive animate-pulse' : 'text-muted-foreground'
            )}
          />
        </div>
      )}

      {/* Timer + controls */}
      <div className='flex items-center gap-2'>
        <span className='font-mono text-sm tabular-nums text-muted-foreground w-12'>
          {formatDuration(elapsedMs)}
        </span>
        <div className='flex gap-1.5 ml-auto'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='gap-1'
            onClick={isRecording ? pause : resume}
          >
            {isRecording ? <Pause className='w-3.5 h-3.5' /> : <Play className='w-3.5 h-3.5' />}
            {isRecording ? 'Pause' : 'Resume'}
          </Button>
          <Button
            type='button'
            variant='destructive'
            size='sm'
            className='gap-1'
            onClick={stop}
          >
            <Square className='w-3.5 h-3.5 fill-current' />
            Stop
          </Button>
        </div>
      </div>
    </div>
  );
}
