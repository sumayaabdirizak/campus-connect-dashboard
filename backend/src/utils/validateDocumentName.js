/**
 * Validate uploaded document display names (browser originalname).
 * Rejects path traversal, empty names, and characters that break downloads.
 */

export const DOCUMENT_NAME_MAX_LENGTH = 200;

/** Letters, numbers, spaces, and a small set of punctuation safe for downloads. */
const SAFE_DOCUMENT_NAME = /^[A-Za-z0-9 ._()\-[\]']+$/;

/**
 * @param {unknown} originalName
 * @param {{ allowedExtensions?: string[] }} [opts]
 * @returns {{ ok: true, name: string } | { ok: false, message: string }}
 */
export function validateDocumentName(originalName, opts = {}) {
  const raw = String(originalName ?? '').trim();
  if (!raw) {
    return { ok: false, message: 'Document name is required' };
  }
  if (raw.length > DOCUMENT_NAME_MAX_LENGTH) {
    return {
      ok: false,
      message: `Document name must be ${DOCUMENT_NAME_MAX_LENGTH} characters or fewer`,
    };
  }
  if (raw === '.' || raw === '..' || raw.includes('..')) {
    return { ok: false, message: 'Document name is invalid' };
  }
  if (!SAFE_DOCUMENT_NAME.test(raw)) {
    return {
      ok: false,
      message:
        "Document name can only use letters, numbers, spaces, and . _ - ( ) [ ] '",
    };
  }
  if (!/[A-Za-z0-9]/.test(raw)) {
    return { ok: false, message: 'Document name must include letters or numbers' };
  }

  const lastDot = raw.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === raw.length - 1) {
    return { ok: false, message: 'Document name must include a file extension' };
  }

  const ext = raw.slice(lastDot).toLowerCase();
  const allowed = opts.allowedExtensions;
  if (Array.isArray(allowed) && allowed.length > 0) {
    const normalized = allowed.map((e) =>
      e.startsWith('.') ? e.toLowerCase() : `.${e.toLowerCase()}`
    );
    if (!normalized.includes(ext)) {
      return {
        ok: false,
        message: `Document must be one of: ${normalized.join(', ')}`,
      };
    }
  }

  return { ok: true, name: raw };
}

export const QUIZ_PAPER_EXTENSIONS = ['.pdf', '.doc', '.docx'];

export const ASSIGNMENT_ATTACHMENT_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.txt',
  '.csv',
  '.png',
  '.jpg',
  '.jpeg',
  '.zip',
];
