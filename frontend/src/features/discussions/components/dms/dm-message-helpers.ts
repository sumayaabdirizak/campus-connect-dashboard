export const DM_QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '🔥'];

export function formatDmTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
