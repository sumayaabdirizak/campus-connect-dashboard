export function isAnnouncementDiagnosticsEnabled(): boolean {
  if (
    typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_ANNOUNCEMENT_DIAGNOSTIC === 'true'
  ) {
    return true;
  }
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('announcementDiag') === '1';
  } catch {
    return false;
  }
}
