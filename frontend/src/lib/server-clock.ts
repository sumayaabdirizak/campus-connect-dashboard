/**
 * Client clock skew correction — schedule gates and countdowns should use
 * `serverNow()` instead of `Date.now()` so a wrong device clock cannot
 * mislead the UI. Backend enforcement remains the source of truth.
 *
 * Skew: clientNow - serverNow (positive = device clock is ahead).
 */

let skewMs = 0;

export function syncServerTime(serverIso: string): void {
  const serverMs = new Date(serverIso).getTime();
  if (Number.isNaN(serverMs)) return;
  skewMs = Date.now() - serverMs;
}

export function syncServerTimeFromResponse(response: Response): void {
  const header = response.headers.get('X-Server-Time');
  if (header) syncServerTime(header);
}

export function getClockSkewMs(): number {
  return skewMs;
}

/** Epoch ms aligned to the last known server time. */
export function serverNow(): number {
  return Date.now() - skewMs;
}

export function serverNowDate(): Date {
  return new Date(serverNow());
}
