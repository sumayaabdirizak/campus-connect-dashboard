'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@/lib/async-query';
import { ensureSocket } from '@/lib/discussions/queries/socket-connection';
import { inboxKeys } from '@/lib/inbox/inbox-queries';
import { officeKeys } from './office-queries';

type OfficeMessageNewPayload = {
  threadId?: number;
  officeId?: number | null;
  officeSlug?: string | null;
};

/** Listen for office chat messages; invalidate thread + inbox caches. */
export function useOfficeMessageSocket(enabled = true) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const socket = ensureSocket();

    const onNew = (raw: unknown) => {
      const payload = (raw ?? {}) as OfficeMessageNewPayload;
      const threadId = Number(payload.threadId);
      if (Number.isFinite(threadId) && threadId > 0) {
        void qc.invalidateQueries({ queryKey: officeKeys.thread(threadId) });
      }
      if (payload.officeSlug) {
        void qc.invalidateQueries({ queryKey: officeKeys.dm(payload.officeSlug) });
        void qc.invalidateQueries({
          queryKey: [...officeKeys.all, 'inbox', payload.officeSlug],
        });
      }
      void qc.invalidateQueries({ queryKey: officeKeys.mine() });
      void qc.invalidateQueries({ queryKey: inboxKeys.all });
    };

    socket.on('office:message:new', onNew);
    return () => {
      socket.off('office:message:new', onNew);
    };
  }, [enabled, qc]);
}
