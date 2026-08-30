import { serverNow } from '@/lib/server-clock';

export function closingSoon(closeAt: string | null | undefined): boolean {
  if (!closeAt) return false;
  const closesInMs = new Date(closeAt).getTime() - serverNow();
  return closesInMs > 0 && closesInMs < 24 * 60 * 60 * 1000;
}

export function minutesLeft(expiresAt: string | null | undefined): number | null {
  if (!expiresAt) return null;
  return Math.max(
    0,
    Math.floor((new Date(expiresAt).getTime() - serverNow()) / 60_000)
  );
}
