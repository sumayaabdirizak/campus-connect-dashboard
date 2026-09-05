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

function formatErrorDetails(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as { details?: unknown; issues?: unknown };

  // Zod issues from announcement create/patch: { message, issues: [{ message, path }] }
  const issues = record.issues;
  if (Array.isArray(issues) && issues.length > 0) {
    const msgs = issues
      .map((issue) => {
        if (!issue || typeof issue !== 'object') return null;
        const msg = (issue as { message?: unknown }).message;
        return typeof msg === 'string' && msg.trim() ? msg.trim() : null;
      })
      .filter(Boolean);
    if (msgs.length > 0) return msgs.join(' · ');
  }

  const details = record.details;
  if (typeof details === 'string' && details.trim()) return details.trim();
  if (Array.isArray(details) && details.length > 0) {
    return details.map(String).filter(Boolean).join(' · ');
  }
  if (details && typeof details === 'object') {
    try {
      return JSON.stringify(details);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/** Normalize any thrown value into a user-friendly API error. */
export function parseApiError(error: unknown, fallbackMessage = 'Something went wrong'): ParsedApiError {
  if (error instanceof ParsedApiError) return error;

  if (isNetworkError(error)) {
    return new ParsedApiError('Network error. Check your connection and try again.', 'network');
  }

  const apiData =
    error instanceof Error && 'data' in error
      ? (error as Error & { data?: unknown }).data
      : undefined;
  const detailText = formatErrorDetails(apiData);

  let message =
    error instanceof Error && error.message.trim() ? error.message.trim() : fallbackMessage;

  // Prefer specific Joi/Zod detail over generic "Validation failed"
  if (detailText && /^validation failed$/i.test(message)) {
    message = detailText;
  }

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
    status === 409 ||
    lower.includes('invalid') ||
    lower.includes('validation') ||
    lower.includes('required') ||
    lower.includes('already in use')
  ) {
    return new ParsedApiError(message, 'validation', {
      status,
      toastType: 'warning',
      description: detailText && detailText !== message ? detailText : undefined
    });
  }

  if (status != null && status >= 500) {
    return new ParsedApiError('Server error. Please try again in a moment.', 'server', {
      status,
      description: message,
    });
  }

  return new ParsedApiError(message, 'unknown', { status, description: detailText });
}

/** Parse an API error and show the appropriate toast. Returns the parsed error. */
export function handleApiError(error: unknown, fallbackMessage?: string): ParsedApiError {
  const parsed = parseApiError(error, fallbackMessage);
  showToast(parsed.toastType, parsed.message, parsed.description);
  return parsed;
}
