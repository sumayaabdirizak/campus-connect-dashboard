/**
 * Subscribes to the discussion socket's reconnect counter. The returned value
 * increments every time the socket reconnects after a disconnect, so hooks
 * that hold mutable state (e.g. message lists) can put it in their effect
 * deps and refetch on reconnect.
 *
 * Returns 0 on first mount; doesn't fire on the initial connect.
 */

'use client';

import { useEffect, useState } from 'react';
import { getReconnectGeneration, subscribeReconnect } from '../api/socket';

export function useReconnectGeneration(): number {
  const [gen, setGen] = useState(() => getReconnectGeneration());
  useEffect(() => {
    setGen(getReconnectGeneration());
    return subscribeReconnect((n) => setGen(n));
  }, []);
  return gen;
}
