import type { ToastType } from './toast';
import { showToast } from './toast';

export type ApiErrorKind =
  | 'network'
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'server'
  | 'unknown';

export class ParsedApiError extends Error {
  kind: ApiErrorKind;
  status?: number;
  toastType: ToastType;
  description?: string;

  constructor(
    message: string,
    kind: ApiErrorKind,
    options?: { status?: number; description?: string; toastType?: ToastType }
  ) {
    super(message);
    this.name = 'ParsedApiError';
    this.kind = kind;
    this.status = options?.status;
    this.description = options?.description;
    this.toastType = options?.toastType ?? (kind === 'validation' ? 'warning' : 'error');
  }
}

function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    error.name === 'TypeError' ||
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('load failed')
  );
}

/** Normalize any thrown value into a user-friendly API error. */
export function parseApiError(error: unknown, fallbackMessage = 'Something went wrong'): ParsedApiError {
  if (error instanceof ParsedApiError) return error;

  if (isNetworkError(error)) {
    return new ParsedApiError('Network error. Check your connection and try again.', 'network');
  }

  const message =
    error instanceof Error && error.message.trim() ? error.message.trim() : fallbackMessage;

  const status =
    error instanceof Error && 'status' in error && typeof error.status === 'number'
      ? error.status
      : undefined;

  const lower = message.toLowerCase();

  if (status === 401 || lower.includes('session expired') || lower.includes('unauthorized')) {
    return new ParsedApiError(
      status === 401 ? 'Your session expired. Please sign in again.' : message,
      'unauthorized',
      { status, toastType: 'warning' }
    );
  }

  if (status === 403 || lower.includes('forbidden') || lower.includes('permission')) {
    return new ParsedApiError(message || 'You do not have permission to do that.', 'forbidden', {
      status,
      toastType: 'warning',
    });
  }

  if (status === 404 || lower.includes('not found')) {
    return new ParsedApiError(message || 'The requested resource was not found.', 'not_found', {
      status,
    });
  }

  if (
    status === 400 ||
    status === 422 ||
    lower.includes('invalid') ||
    lower.includes('validation') ||
    lower.includes('required')
  ) {
    return new ParsedApiError(message, 'validation', { status, toastType: 'warning' });
  }

  if (status != null && status >= 500) {
    return new ParsedApiError('Server error. Please try again in a moment.', 'server', {
      status,
      description: message,
    });
  }

  return new ParsedApiError(message, 'unknown', { status });
}

/** Parse an API error and show the appropriate toast. Returns the parsed error. */
export function handleApiError(error: unknown, fallbackMessage?: string): ParsedApiError {
  const parsed = parseApiError(error, fallbackMessage);
  showToast(parsed.toastType, parsed.message, parsed.description);
  return parsed;
}
