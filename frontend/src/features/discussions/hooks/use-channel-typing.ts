/**
 * Tracks who is currently typing in a channel or group DM.
 *
 *   useChannelTyping(channelId, myUserId)  → ['Alice', 'Bob']
 *   useGroupDmTyping(groupDmId, myUserId)  → ['Alice']
 *
 * Subscribes to `typing:update` events on the relevant socket room (already
 * joined by useChannelMessages / useGroupDmMessages). Each update carries
 * `{ userId, userName, typing }`. We track active typers in a Map keyed by
 * userId, with a 5-second freshness window — a user is considered "still
 * typing" only if we've heard from them within that window. A sweep timer
 * keeps the UI responsive even when the sender's `typing:stop` is dropped
 * (e.g. sudden disconnect).
 *
 * Excludes the caller's own user id so other tabs of the same user don't
 * trigger a "you are typing" indicator on yourself.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { getDiscussionSocket } from '../api/socket';

const FRESHNESS_MS = 5_000;
const SWEEP_INTERVAL_MS = 1_500;

type TypingEvent = {
  channelId?: number;
  groupDmId?: number;
  groupId?: number;
  userId?: number;
  userName?: string;
  typing?: boolean;
};

type TyperEntry = { userName: string; expiresAt: number };

type TypingScope =
  | { kind: 'channel'; channelId: number }
  | { kind: 'groupDm'; groupDmId: number };

function useTypingForScope(
  scope: TypingScope | null,
  myUserId: number | null
): string[] {
  const [typers, setTypers] = useState<string[]>([]);
  const mapRef = useRef<Map<number, TyperEntry>>(new Map());

  // Stringify scope so the effect dep is stable even if the caller passes a
  // freshly-built object each render.
  const scopeKey = scope
    ? scope.kind === 'channel'
      ? `c:${scope.channelId}`
      : `d:${scope.groupDmId}`
    : null;

  useEffect(() => {
    if (!scope || scopeKey == null) {
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

    const matches = (payload: TypingEvent): boolean => {
      if (scope.kind === 'channel') {
        return Number(payload?.channelId) === scope.channelId;
      }
      return Number(payload?.groupDmId) === scope.groupDmId;
    };

    const onTyping = (payload: TypingEvent) => {
      if (!matches(payload)) return;
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

    const map = mapRef.current;
    return () => {
      socket.off('typing:update', onTyping);
      window.clearInterval(sweep);
      map.clear();
      setTypers([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey, myUserId]);

  return typers;
}

export function useChannelTyping(
  channelId: number | null | undefined,
  myUserId: number | null
): string[] {
  const id = Number(channelId);
  const scope: TypingScope | null =
    Number.isFinite(id) && id > 0 ? { kind: 'channel', channelId: id } : null;
  return useTypingForScope(scope, myUserId);
}

export function useGroupDmTyping(
  groupDmId: number | null | undefined,
  myUserId: number | null
): string[] {
  const id = Number(groupDmId);
  const scope: TypingScope | null =
    Number.isFinite(id) && id > 0 ? { kind: 'groupDm', groupDmId: id } : null;
  return useTypingForScope(scope, myUserId);
}
