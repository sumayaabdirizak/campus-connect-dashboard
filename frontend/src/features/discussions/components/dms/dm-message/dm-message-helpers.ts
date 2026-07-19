export const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '🔥'];

export function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
