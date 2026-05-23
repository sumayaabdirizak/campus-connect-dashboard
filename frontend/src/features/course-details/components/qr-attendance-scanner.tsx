'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, CheckCircle2, ScanLine, X } from 'lucide-react';
import { toast } from 'sonner';
import { scanQr } from '../api/attendance-service';

interface QrAttendanceScannerProps {
  onClose: () => void;
  onScanned?: () => void;
}

/// Student-facing camera scanner. Dynamically imports `html5-qrcode` so it
/// doesn't ship in the main bundle and can be swapped for a manual token
/// paste when the camera is unavailable.
export function QrAttendanceScanner({ onClose, onScanned }: QrAttendanceScannerProps) {
  const containerId = 'qr-scanner-region';
  const scannerRef = useRef<unknown>(null);
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'submitting' | 'done'>('idle');
  const [manualToken, setManualToken] = useState('');

  const captureLocation = (): Promise<{ lat: number; lon: number } | null> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });

  const submit = async (token: string) => {
    setPhase('submitting');
    const coords = await captureLocation();
    try {
      const result = await scanQr({
        token,
        ...(coords ? { lat: coords.lat, lon: coords.lon } : {})
      });
      toast.success(`Marked ${result.status}`);
      setPhase('done');
      onScanned?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Scan failed';
      toast.error(msg);
      setPhase('scanning');
    }
  };

  const startCamera = async () => {
    setPhase('scanning');
    try {
      // Dynamic import — keeps the heavy lib out of the main bundle.
      const mod = await import('html5-qrcode');
      const Html5Qrcode = mod.Html5Qrcode;
      const instance = new Html5Qrcode(containerId);
      scannerRef.current = instance;

      await instance.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 240 },
        async (decodedText: string) => {
          if (phase === 'submitting' || phase === 'done') return;
          await instance.stop().catch(() => {});
          submit(decodedText);
        },
        () => {
          /* per-frame parse failures are noisy; ignore */
        }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Camera error: ${msg}`);
      setPhase('idle');
    }
  };

  useEffect(() => {
    return () => {
      // IMPORTANT: html5-qrcode throws "Cannot clear while scan is ongoing"
      // if .clear() runs before .stop() resolves. Also, on the `Html5Qrcode`
      // class (which we use here), .stop() releases the camera fully — calling
      // .clear() afterwards is redundant and only needed for the higher-level
      // `Html5QrcodeScanner` wrapper. Chain them defensively so neither path
      // throws during unmount.
      const s = scannerRef.current as
        | { stop: () => Promise<void>; clear?: () => void; isScanning?: boolean }
        | null;
      if (!s) return;
      const safeClear = () => {
        try { s.clear?.(); } catch { /* swallow — clear may throw if scan never started */ }
      };
      if (s.isScanning) {
        s.stop().then(safeClear).catch(() => {});
      } else {
        safeClear();
      }
    };
  }, []);

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <ScanLine className='w-5 h-5 text-primary' />
          <p className='font-medium'>Scan attendance QR</p>
        </div>
        <Button variant='ghost' size='icon' onClick={onClose}>
          <X className='w-4 h-4' />
        </Button>
      </div>

      {phase === 'idle' && (
        <Button onClick={startCamera} className='w-full gap-1'>
          <Camera className='w-4 h-4' /> Use camera
        </Button>
      )}

      {(phase === 'scanning' || phase === 'submitting') && (
        <div className='space-y-2'>
          <div
            id={containerId}
            className='w-full aspect-square max-w-sm mx-auto rounded-lg overflow-hidden border bg-black'
          />
          {phase === 'submitting' && (
            <p className='text-sm text-muted-foreground text-center'>Submitting…</p>
          )}
        </div>
      )}

      {phase === 'done' && (
        <div className='flex flex-col items-center gap-2 py-6'>
          <CheckCircle2 className='w-12 h-12 text-emerald-500 dark:text-emerald-400' />
          <p className='font-medium'>Attendance recorded</p>
          <Button variant='outline' onClick={onClose}>
            Close
          </Button>
        </div>
      )}

      {phase !== 'done' && (
        <div className='border-t pt-3 space-y-2'>
          <p className='text-xs text-muted-foreground'>
            Camera unavailable? Ask the teacher to read the code aloud and paste it:
          </p>
          <div className='flex gap-2'>
            <Input
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder='Paste token…'
            />
            <Button
              onClick={() => submit(manualToken.trim())}
              disabled={!manualToken.trim() || phase === 'submitting'}
            >
              Submit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
