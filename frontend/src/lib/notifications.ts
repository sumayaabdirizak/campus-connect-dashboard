'use client';

import { toast } from 'sonner';
import type { SweetAlertIcon, SweetAlertOptions } from 'sweetalert2';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export type ApiErrorKind =
  | 'network'
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'server'
  | 'unknown';

const TOAST_DEDUP_MS = 2500;
const DEFAULT_TOAST_DURATION = 4000;
const recentToastKeys = new Map<string, number>();

let swalModule: typeof import('sweetalert2') | null = null;

async function getSwal() {
  if (!swalModule) {
    // #region agent log
    fetch('http://127.0.0.1:7768/ingest/31870779-47f0-4312-b278-1c6da891de23',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'240e4e'},body:JSON.stringify({sessionId:'240e4e',location:'notifications.ts:getSwal',message:'loading sweetalert2',data:{hasCached:!!swalModule},timestamp:Date.now(),hypothesisId:'H-A',runId:'post-fix'})}).catch(()=>{});
    // #endregion
    try {
      swalModule = await import('sweetalert2');
      // #region agent log
      fetch('http://127.0.0.1:7768/ingest/31870779-47f0-4312-b278-1c6da891de23',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'240e4e'},body:JSON.stringify({sessionId:'240e4e',location:'notifications.ts:getSwal',message:'sweetalert2 loaded',data:{ok:true},timestamp:Date.now(),hypothesisId:'H-A',runId:'post-fix'})}).catch(()=>{});
      // #endregion
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7768/ingest/31870779-47f0-4312-b278-1c6da891de23',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'240e4e'},body:JSON.stringify({sessionId:'240e4e',location:'notifications.ts:getSwal',message:'sweetalert2 import failed',data:{error:err instanceof Error?err.message:String(err)},timestamp:Date.now(),hypothesisId:'H-A',runId:'post-fix'})}).catch(()=>{});
      // #endregion
      throw err;
    }
  }
  return swalModule.default;
}

function swalBaseOptions(): Pick<
  SweetAlertOptions,
  'buttonsStyling' | 'reverseButtons' | 'heightAuto' | 'customClass'
> {
  return {
    buttonsStyling: true,
    reverseButtons: true,
    heightAuto: false,
    customClass: {
      popup: 'swal-themed-popup',
      title: 'swal-themed-title',
      htmlContainer: 'swal-themed-text',
      confirmButton: 'swal-btn-confirm',
      cancelButton: 'swal-btn-cancel'
    }
  };
}

/**
 * Show a deduplicated toast notification (top-right, 4s default).
 * Prefer this over importing `toast` from sonner directly in new code.
 */
export function showToast(type: ToastType, message: string, description?: string): void {
  const key = `${type}:${message}:${description ?? ''}`;
  const now = Date.now();
  const lastShown = recentToastKeys.get(key);
  if (lastShown != null && now - lastShown < TOAST_DEDUP_MS) return;
  recentToastKeys.set(key, now);

  const options = {
    description,
    duration: DEFAULT_TOAST_DURATION,
    closeButton: true
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
    return new ParsedApiError(
      'Network error. Check your connection and try again.',
      'network'
    );
  }

  const message =
    error instanceof Error && error.message.trim()
      ? error.message.trim()
      : fallbackMessage;

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
      toastType: 'warning'
    });
  }

  if (status === 404 || lower.includes('not found')) {
    return new ParsedApiError(message || 'The requested resource was not found.', 'not_found', {
      status
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
    return new ParsedApiError(
      'Server error. Please try again in a moment.',
      'server',
      { status, description: message }
    );
  }

  return new ParsedApiError(message, 'unknown', { status });
}

/** Parse an API error and show the appropriate toast. Returns the parsed error. */
export function handleApiError(error: unknown, fallbackMessage?: string): ParsedApiError {
  const parsed = parseApiError(error, fallbackMessage);
  showToast(parsed.toastType, parsed.message, parsed.description);
  return parsed;
}

/** SweetAlert2 confirmation for important or destructive actions. */
export async function confirmAction(
  title: string,
  text: string,
  confirmText = 'Confirm',
  options?: {
    cancelText?: string;
    icon?: SweetAlertIcon;
    danger?: boolean;
  }
): Promise<boolean> {
  const Swal = await getSwal();
  const result = await Swal.fire({
    title,
    text,
    icon: options?.icon ?? (options?.danger ? 'warning' : 'question'),
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: options?.cancelText ?? 'Cancel',
    focusCancel: options?.danger ?? false,
    backdrop: true,
    width: undefined,
    ...swalBaseOptions(),
    customClass: {
      ...swalBaseOptions().customClass,
      confirmButton: options?.danger ? 'swal-btn-danger' : 'swal-btn-confirm'
    }
  });
  return result.isConfirmed;
}

/** Shorthand for delete confirmations. */
export async function confirmDelete(label?: string): Promise<boolean> {
  return confirmAction(
    'Delete this item?',
    label
      ? `"${label}" will be permanently removed. This cannot be undone.`
      : 'This action cannot be undone.',
    'Delete',
    { danger: true, icon: 'warning', cancelText: 'Keep' }
  );
}

/** SweetAlert2 success dialog (e.g. after a major action completes). */
export async function showSuccessAlert(title: string, text?: string): Promise<void> {
  const Swal = await getSwal();
  await Swal.fire({
    title,
    text,
    icon: 'success',
    confirmButtonText: 'OK',
    backdrop: true,
    ...swalBaseOptions()
  });
}

/** SweetAlert2 error dialog for failed important actions. */
export async function showErrorAlert(title: string, text?: string): Promise<void> {
  const Swal = await getSwal();
  await Swal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonText: 'OK',
    backdrop: true,
    ...swalBaseOptions(),
    customClass: {
      ...swalBaseOptions().customClass,
      confirmButton: 'swal-btn-danger'
    }
  });
}

/** Logout confirmation. */
export async function confirmLogout(): Promise<boolean> {
  return confirmAction(
    'Sign out?',
    'You will need to sign in again to access your account.',
    'Sign out',
    { icon: 'question', cancelText: 'Stay signed in' }
  );
}
