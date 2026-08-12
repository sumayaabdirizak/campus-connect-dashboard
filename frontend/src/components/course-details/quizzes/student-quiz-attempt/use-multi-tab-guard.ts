'use client';

import { useEffect, useState } from 'react';

export function useMultiTabGuard(attemptId: number, previewMode: boolean) {
  const [multiTabConflict, setMultiTabConflict] = useState(false);

  useEffect(() => {
    if (previewMode) return;
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(`quiz-attempt-${attemptId}`);
    let acknowledged = false;
    channel.onmessage = (e) => {
      if (e.data === 'claim') {
        channel.postMessage('ack');
        setMultiTabConflict(true);
      } else if (e.data === 'ack' && !acknowledged) {
        acknowledged = true;
        setMultiTabConflict(true);
      }
    };
    channel.postMessage('claim');
    return () => channel.close();
  }, [attemptId, previewMode]);

  return multiTabConflict;
}
