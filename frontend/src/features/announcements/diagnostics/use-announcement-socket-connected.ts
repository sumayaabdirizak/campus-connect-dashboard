'use client';

import { useEffect, useState } from 'react';
import { getAnnouncementSocket } from '../api/use-announcement-socket';

export function useAnnouncementSocketConnected(enabled: boolean) {
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const poll = () => setSocketConnected(!!getAnnouncementSocket()?.connected);
    poll();
    const s = getAnnouncementSocket();
    if (s) {
      s.on('connect', poll);
      s.on('disconnect', poll);
      return () => {
        s.off('connect', poll);
        s.off('disconnect', poll);
      };
    }
    const id = window.setInterval(poll, 500);
    return () => window.clearInterval(id);
  }, [enabled]);

  return socketConnected;
}
