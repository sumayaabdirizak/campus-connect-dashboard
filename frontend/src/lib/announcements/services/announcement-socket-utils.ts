import type { Announcement } from '../types';
import type { AnnouncementRealtimePayload } from './socket-payloads';

export function playNotificationSound() {
  if (typeof window === 'undefined') return;
  const AudioContextCtor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;

  const context = new AudioContextCtor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = 880;
  gain.gain.value = 0.04;

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start();
  oscillator.stop(context.currentTime + 0.12);
}

export function getJwtToken(explicitToken?: string | null): string | null {
  if (explicitToken) return explicitToken;
  if (typeof window === 'undefined') return null;
  return (
    window.sessionStorage.getItem('auth_token') || window.localStorage.getItem('auth_token') || null
  );
}

export function toAnnouncement(payload: AnnouncementRealtimePayload): Announcement {
  return {
    id: payload.id,
    title: payload.title,
    content: payload.content,
    priority: payload.priority,
    targetType: payload.targetType,
    status: payload.status as Announcement['status'],
    expiresAt: payload.expiresAt ?? undefined,
    targeting: payload.targeting,
    imageUrls: payload.imageUrls ?? [],
    targetRoles: payload.targetRoles ?? [],
    isActive: payload.isActive !== false,
    createdAt: payload.createdAt,
    createdBy: {
      id: 'system',
      name: 'System',
      role: 'SUPER_ADMIN',
    },
    isRead: false,
  };
}
