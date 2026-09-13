import type { SweetAlertIcon, SweetAlertOptions } from 'sweetalert2';

let swalModule: typeof import('sweetalert2') | null = null;

async function getSwal() {
  if (!swalModule) {
    swalModule = await import('sweetalert2');
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
      cancelButton: 'swal-btn-cancel',
    },
  };
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
      confirmButton: options?.danger ? 'swal-btn-danger' : 'swal-btn-confirm',
    },
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

/** Logout confirmation. */
export async function confirmLogout(): Promise<boolean> {
  return confirmAction(
    'Sign out?',
    'You will need to sign in again to access your account.',
    'Sign out',
    { icon: 'question', cancelText: 'Stay signed in' }
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
    ...swalBaseOptions(),
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
      confirmButton: 'swal-btn-danger',
    },
  });
}
