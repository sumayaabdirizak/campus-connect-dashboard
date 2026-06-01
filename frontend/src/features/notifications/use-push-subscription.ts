'use client';

import { useCallback, useEffect, useState } from 'react';
import { subscribeUserToPush, unsubscribeUserFromPush } from './web-push';

type Permission = 'default' | 'granted' | 'denied' | 'unsupported';

interface PushSubscriptionState {
  permission: Permission;
  subscribed: boolean;
  loading: boolean;
  /** Request OS permission (if needed), then subscribe + persist on the server.
   *  Returns `true` when the subscription was created, `false` when push is
   *  unavailable on this server (VAPID not configured). */
  enable: () => Promise<boolean>;
  /** Drop the local + server subscription. Browser permission stays granted. */
  disable: () => Promise<void>;
}

export function usePushSubscription(): PushSubscriptionState {
  const [permission, setPermission] = useState<Permission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission as Permission);
    // Reflect current subscription state from the SW so the toggle is correct
    // on first paint without forcing the user to re-grant.
    navigator.serviceWorker
      .getRegistration()
      .then(async (reg) => {
        if (!reg) return;
        const existing = await reg.pushManager.getSubscription();
        setSubscribed(!!existing);
      })
      .catch(() => {});
  }, []);

  const enable = useCallback(async (): Promise<boolean> => {
    if (permission === 'unsupported') return false;
    setLoading(true);
    try {
      if (Notification.permission !== 'granted') {
        const result = await Notification.requestPermission();
        setPermission(result as Permission);
        if (result !== 'granted') return false;
      }
      const sub = await subscribeUserToPush();
      setSubscribed(!!sub);
      // null means server-side push is not configured (VAPID missing).
      return sub !== null;
    } finally {
      setLoading(false);
    }
  }, [permission]);

  const disable = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await unsubscribeUserFromPush({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  return { permission, subscribed, loading, enable, disable };
}
