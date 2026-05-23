'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, MapPin, QrCode, X } from 'lucide-react';
import { toast } from 'sonner';
import { refreshQrToken, startQrSession, stopQrSession } from '../api/attendance-service';
import type { ClassSchedule, QrSession } from '../api/attendance-types';

interface QrAttendanceHostProps {
  schedule: ClassSchedule | null;
  onClose: () => void;
}

const DEFAULT_DURATION = 10;
const DEFAULT_RADIUS = 50;

/// Teacher-facing rotating-QR panel. Calls `start`, displays the first token
/// as a QR code, then polls `/token` at the rotation cadence. Auto-stops when
/// the session expires or the dialog closes.
export function QrAttendanceHost({ schedule, onClose }: QrAttendanceHostProps) {
  const [duration, setDuration] = useState<number>(DEFAULT_DURATION);
  const [geofenceOn, setGeofenceOn] = useState(false);
  const [radius, setRadius] = useState<number>(DEFAULT_RADIUS);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [session, setSession] = useState<QrSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const [starting, setStarting] = useState(false);
  const timerRef = useRef<number | null>(null);
  const rotateRef = useRef<number | null>(null);

  // Stop everything on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (rotateRef.current) window.clearInterval(rotateRef.current);
    };
  }, []);

  const captureLocation = async (): Promise<{ lat: number; lon: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        toast.error('Geolocation not supported in this browser');
        return resolve(null);
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => {
          toast.error(`Location error: ${err.message}`);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10_000 }
      );
    });
  };

  const handleStart = async () => {
    if (!schedule) return;
    setStarting(true);
    try {
      let geo: { lat: number; lon: number } | null = null;
      if (geofenceOn) {
        geo = coords ?? (await captureLocation());
        if (!geo) {
          setStarting(false);
          return;
        }
        setCoords(geo);
      }
      const result = await startQrSession({
        scheduleId: schedule.id,
        durationMinutes: duration,
        ...(geo ? { lat: geo.lat, lon: geo.lon, radius } : {})
      });
      setSession(result);
      setToken(result.token);

      const endsAtMs = new Date(result.endsAt).getTime();
      const tickRemaining = () => {
        const secs = Math.max(0, Math.floor((endsAtMs - Date.now()) / 1000));
        setRemaining(secs);
        if (secs === 0) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          if (rotateRef.current) window.clearInterval(rotateRef.current);
          toast.info('Attendance session ended');
        }
      };
      tickRemaining();
      timerRef.current = window.setInterval(tickRemaining, 1000);

      // Rotate token a beat before the server's TTL expires so the QR is
      // never stale during display.
      const rotateEveryMs = Math.max((result.tokenTtlSeconds - 2) * 1000, 5000);
      rotateRef.current = window.setInterval(async () => {
        try {
          const next = await refreshQrToken(result.sessionId);
          setToken(next.token);
        } catch {
          /* if rotation fails the existing token still has a few seconds */
        }
      }, rotateEveryMs);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start';
      toast.error(msg);
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (rotateRef.current) window.clearInterval(rotateRef.current);
    if (session?.sessionId) {
      try {
        await stopQrSession(session.sessionId);
      } catch {
        /* swallow */
      }
    }
    onClose();
  };

  if (!schedule) return null;

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <QrCode className='w-5 h-5 text-primary' />
          <p className='font-medium'>QR Attendance · {schedule.location}</p>
        </div>
        <Button variant='ghost' size='icon' onClick={handleStop}>
          <X className='w-4 h-4' />
        </Button>
      </div>

      {!session ? (
        <div className='space-y-3'>
          <div className='space-y-1'>
            <Label className='text-xs'>Duration (minutes)</Label>
            <Input
              type='number'
              min={1}
              max={120}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) || DEFAULT_DURATION)}
            />
          </div>

          <div className='flex items-center justify-between rounded-lg border p-3'>
            <div>
              <div className='flex items-center gap-2'>
                <MapPin className='w-4 h-4 text-muted-foreground' />
                <Label className='text-sm'>Require students to be nearby</Label>
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                Captures your location now and rejects scans further than the chosen radius.
              </p>
            </div>
            <Switch checked={geofenceOn} onCheckedChange={setGeofenceOn} />
          </div>

          {geofenceOn && (
            <div className='space-y-1'>
              <Label className='text-xs'>Radius (metres)</Label>
              <Input
                type='number'
                min={10}
                max={500}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value) || DEFAULT_RADIUS)}
              />
            </div>
          )}

          <Button onClick={handleStart} disabled={starting} className='w-full gap-1'>
            {starting ? <Loader2 className='w-4 h-4 animate-spin' /> : <QrCode className='w-4 h-4' />}
            {starting ? 'Starting…' : 'Start session'}
          </Button>
        </div>
      ) : (
        <div className='space-y-3 text-center'>
          {token ? (
            <div className='flex flex-col items-center gap-2'>
              <div className='bg-white p-3 rounded-lg border'>
                <QRCodeSVG value={token} size={208} level='M' />
              </div>
              <p className='text-xs text-muted-foreground'>
                QR rotates every {session.tokenTtlSeconds}s · scan from your phone
              </p>
            </div>
          ) : (
            <p className='text-sm text-muted-foreground'>Generating QR…</p>
          )}

          <div>
            <p className='text-3xl font-bold text-primary tabular-nums'>
              {Math.floor(remaining / 60)
                .toString()
                .padStart(2, '0')}
              :{(remaining % 60).toString().padStart(2, '0')}
            </p>
            <p className='text-xs text-muted-foreground'>Session ends automatically</p>
          </div>

          {session.geofence && (
            <p className='inline-flex items-center gap-1 text-xs text-muted-foreground'>
              <MapPin className='w-3 h-3' /> Geofenced · {session.geofence.radius} m
            </p>
          )}

          <Button variant='outline' onClick={handleStop} className='w-full'>
            Stop session
          </Button>
        </div>
      )}
    </div>
  );
}
