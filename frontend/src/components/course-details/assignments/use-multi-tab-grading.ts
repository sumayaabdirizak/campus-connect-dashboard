'use client';

import { useEffect, useState } from 'react';

/** Warn when another tab is grading the same assignment. */
export function useMultiTabGradingGuard(assignmentId: number) {
  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(`assignment-grading-${assignmentId}`);
    let acknowledged = false;
    channel.onmessage = (e) => {
      if (e.data === 'claim') {
        channel.postMessage('ack');
        setConflict(true);
      } else if (e.data === 'ack' && !acknowledged) {
        acknowledged = true;
        setConflict(true);
      }
    };
    channel.postMessage('claim');
    return () => channel.close();
  }, [assignmentId]);

  return conflict;
}
