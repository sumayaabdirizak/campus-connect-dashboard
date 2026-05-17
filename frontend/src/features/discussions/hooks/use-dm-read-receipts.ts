/**
 * Tracks read receipts for a group DM in memory.
 *
 *   const { receiptsByUser, latestReadByOthers } =
 *     useDmReadReceipts(groupDmId, myUserId);
 *
 * Subscribes to `message:read:update` socket events scoped to the DM room
 * (already joined by useGroupDmMessages). For each member, records the
 * highest messageId they've read. The component layer uses this to render
 * a "✓✓ seen" indicator on the latest message you've sent that's been read
 * by anyone else.
 *
 * Limitations (acceptable for v1):
 *   - No initial-state fetch — the indicator only appears for events that
 *     arrive after the user opens the DM. If Alice read your message 2
 *     days ago and you just open the DM now, you won't see the receipt
 *     until she sends or reads something new.
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getDiscussionSocket } from '../api/socket';
import { getGroupDmReceipts } from '../api/service';
import { useReconnectGeneration } from './use-reconnect-generation';

type ReadReceiptUpdate = {
  groupDmId?: number | null;
  messageId?: number | null;
  userId?: number;
  readAt?: string;
};

export function useDmReadReceipts(
  groupDmId: number | null | undefined,
  myUserId: number | null
): {
  receiptsByUser: Map<number, { messageId: number; readAt: string }>;
  /** Highest messageId read by *any* user other than the caller. Used to
   *  compute whether your last sent message is "seen". */
  latestReadByOthers: number | null;
} {
  const validId =
    Number.isFinite(Number(groupDmId)) && Number(groupDmId) > 0
      ? Number(groupDmId)
      : null;

  const [, forceRender] = useState(0);
  const mapRef = useRef<Map<number, { messageId: number; readAt: string }>>(
    new Map()
  );
  const reconnectGen = useReconnectGeneration();

  // Seed initial state from REST on mount + after reconnect — covers the
  // "Alice read your message yesterday but you only just opened the DM"
  // case. Subsequent socket events advance the same map.
  useEffect(() => {
    if (validId == null) {
      mapRef.current.clear();
      forceRender((n) => n + 1);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await getGroupDmReceipts(validId);
        if (cancelled) return;
        const map = mapRef.current;
        for (const row of res.results ?? []) {
          const prev = map.get(row.userId);
          if (prev && prev.messageId >= row.messageId) continue;
          map.set(row.userId, {
            messageId: row.messageId,
            readAt: row.readAt
          });
        }
        forceRender((n) => n + 1);
      } catch {
        /* best-effort seed; socket events will fill in */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [validId, reconnectGen]);

  useEffect(() => {
    if (validId == null) {
      mapRef.current.clear();
      forceRender((n) => n + 1);
      return;
    }
    const socket = getDiscussionSocket();
    const onUpdate = (payload: ReadReceiptUpdate) => {
      if (Number(payload?.groupDmId) !== validId) return;
      const userId = Number(payload?.userId);
      const messageId = Number(payload?.messageId);
      if (!Number.isFinite(userId) || !Number.isFinite(messageId)) return;
      const map = mapRef.current;
      const prev = map.get(userId);
      // Only advance — never regress someone's read marker.
      if (prev && prev.messageId >= messageId) return;
      map.set(userId, {
        messageId,
        readAt: payload?.readAt ?? new Date().toISOString()
      });
      forceRender((n) => n + 1);
    };
    socket.on('message:read:update', onUpdate);
    const map = mapRef.current;
    return () => {
      socket.off('message:read:update', onUpdate);
      map.clear();
      forceRender((n) => n + 1);
    };
  }, [validId]);

  const receiptsByUser = mapRef.current;
  const latestReadByOthers = useMemo(() => {
    let max = 0;
    for (const [uid, entry] of receiptsByUser) {
      if (myUserId != null && uid === myUserId) continue;
      if (entry.messageId > max) max = entry.messageId;
    }
    return max > 0 ? max : null;
    // We intentionally depend on a stable "tick" via forceRender; the Map
    // itself is mutated in place but referentially identical.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiptsByUser, myUserId, mapRef.current.size]);

  return { receiptsByUser, latestReadByOthers };
}
