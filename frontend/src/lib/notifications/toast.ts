import { toast } from 'sonner';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

const TOAST_DEDUP_MS = 2500;
const DEFAULT_TOAST_DURATION = 4000;
const recentToastKeys = new Map<string, number>();

/** Show a deduplicated toast notification (top-right, 4s default). */
export function showToast(type: ToastType, message: string, description?: string): void {
  const key = `${type}:${message}:${description ?? ''}`;
  const now = Date.now();
  const lastShown = recentToastKeys.get(key);
  if (lastShown != null && now - lastShown < TOAST_DEDUP_MS) return;
  recentToastKeys.set(key, now);

  const options = {
    description,
    duration: DEFAULT_TOAST_DURATION,
    closeButton: true,
  };

  switch (type) {
    case 'success':
      toast.success(message, options);
      break;
    case 'error':
      toast.error(message, options);
      break;
    case 'warning':
      toast.warning(message, options);
      break;
    case 'info':
      toast.info(message, options);
      break;
  }
}
