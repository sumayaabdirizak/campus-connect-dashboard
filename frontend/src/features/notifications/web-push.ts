'use client';

import { apiClient } from '@/lib/api-client';

const SW_PATH = '/sw.js';

export async function registerAnnouncementServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeUserToPush(): Promise<PushSubscription | null> {
  // The backend returns 503 when VAPID keys are not configured (dev / self-
  // hosted without push set up). Treat this as "push unavailable" rather than
  // a hard error so the toggle doesn't crash the page.
  let publicKey: string | undefined;
  try {
    const resp = await apiClient<{ publicKey: string }>('/push/vapid-public-key');
    publicKey = resp.publicKey;
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('VAPID') || msg.includes('503') || msg.includes('not configured')) {
      return null;
    }
    throw err;
  }
  if (!publicKey) return null;
  const reg = await registerAnnouncementServiceWorker();
  if (!reg) return null;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey)
  });
  const body = sub.toJSON();
  await apiClient('/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: body.endpoint,
      keys: body.keys
    })
  });
  return sub;
}

export async function unsubscribeUserFromPush(sub: Pick<PushSubscription, 'endpoint'>): Promise<void> {
  await apiClient('/push/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ endpoint: sub.endpoint })
  });
}
