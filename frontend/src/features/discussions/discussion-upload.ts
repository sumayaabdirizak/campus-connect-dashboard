import { ensureCsrfToken } from '@/lib/api-client';
import { buildApiUrl } from '@/lib/api-config';

export type DiscussionUploadResult = {
  id: number;
  status: string;
  fileType: string;
  mimeType: string;
  size: number;
  isE2EE?: boolean;
};

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Multipart upload to POST /api/discussions/uploads with optional E2EE metadata
 * (ciphertextHash = SHA-256 of file bytes, random nonce, keyVersion).
 */
export function uploadDiscussionFile(args: {
  file: File;
  channelId: number;
  keyVersion: number;
  requireE2eeMetadata: boolean;
  onProgress?: (percent: number) => void;
}): { promise: Promise<DiscussionUploadResult>; abort: () => void } {
  const xhr = new XMLHttpRequest();
  const abort = () => {
    try {
      xhr.abort();
    } catch {
      /* ignore */
    }
  };

  const promise = (async (): Promise<DiscussionUploadResult> => {
    const form = new FormData();
    form.append('file', args.file);
    form.append('channelId', String(args.channelId));
    if (args.requireE2eeMetadata) {
      const hex = await sha256Hex(args.file);
      const nonce = Array.from(crypto.getRandomValues(new Uint8Array(12)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      form.append('ciphertextHash', hex);
      form.append('nonce', nonce);
      form.append('keyVersion', String(args.keyVersion));
    }

    return new Promise((resolve, reject) => {
      xhr.open('POST', buildApiUrl('/discussions/uploads'));
      xhr.withCredentials = true;

      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable && args.onProgress) {
          args.onProgress(Math.min(100, Math.round((100 * ev.loaded) / Math.max(1, ev.total))));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const body = JSON.parse(xhr.responseText) as DiscussionUploadResult & { message?: string };
            if (body && typeof body.id === 'number') {
              resolve(body as DiscussionUploadResult);
            } else {
              reject(new Error('Invalid upload response'));
            }
          } catch {
            reject(new Error('Invalid upload response'));
          }
        } else {
          try {
            const errBody = JSON.parse(xhr.responseText) as { message?: string };
            reject(new Error(errBody?.message || `Upload failed (${xhr.status})`));
          } catch {
            reject(new Error(`Upload failed (${xhr.status})`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error'));
      xhr.onabort = () => reject(new Error('Upload cancelled'));

      void (async () => {
        try {
          const csrf = await ensureCsrfToken();
          if (csrf) xhr.setRequestHeader('X-CSRF-Token', csrf);
          xhr.send(form);
        } catch (e) {
          reject(e instanceof Error ? e : new Error('Could not start upload'));
        }
      })();
    });
  })();

  return { promise, abort };
}
