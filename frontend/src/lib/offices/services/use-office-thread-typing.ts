'use client';

import { useEffect, useRef, useState } from 'react';
import { getDiscussionSocket } from '@/lib/discussions/queries/socket';

const FRESHNESS_MS = 5_000;
const SWEEP_INTERVAL_MS = 1_500;

type TypingEvent = {
  officeThreadId?: number;
  userId?: number;
  userName?: string;
  typing?: boolean;
};

type TyperEntry = { userName: string; expiresAt: number };

/** Names of people typing in an office thread (excludes self). */
export function useOfficeThreadTyping(
  officeThreadId: number | null | undefined,
  myUserId: number | null
): string[] {
  const id = Number(officeThreadId);
  const enabled = Number.isFinite(id) && id > 0;
  const [typers, setTypers] = useState<string[]>([]);
  const mapRef = useRef<Map<number, TyperEntry>>(new Map());

  useEffect(() => {
    if (!enabled) {
      mapRef.current.clear();
      setTypers([]);
      return;
    }

    const socket = getDiscussionSocket();

    const recompute = () => {
      const now = Date.now();
      const map = mapRef.current;
      let changed = false;
      for (const [uid, entry] of map) {
        if (entry.expiresAt <= now) {
          map.delete(uid);
          changed = true;
        }
      }
      if (changed) {
        setTypers(Array.from(map.values()).map((e) => e.userName));
      }
    };

    const onTyping = (payload: TypingEvent) => {
      if (Number(payload?.officeThreadId) !== id) return;
      const userId = Number(payload?.userId);
      if (!Number.isFinite(userId)) return;
      if (myUserId != null && userId === myUserId) return;

      const map = mapRef.current;
      if (payload.typing === false) {
        if (map.delete(userId)) {
          setTypers(Array.from(map.values()).map((e) => e.userName));
        }
        return;
      }
      const userName = String(payload?.userName ?? `Member ${userId}`);
      map.set(userId, { userName, expiresAt: Date.now() + FRESHNESS_MS });
      setTypers(Array.from(map.values()).map((e) => e.userName));
    };

    socket.on('typing:update', onTyping);
    const sweep = window.setInterval(recompute, SWEEP_INTERVAL_MS);

    return () => {
      socket.off('typing:update', onTyping);
      window.clearInterval(sweep);
      mapRef.current.clear();
      setTypers([]);
    };
  }, [enabled, id, myUserId]);

  return typers;
}
