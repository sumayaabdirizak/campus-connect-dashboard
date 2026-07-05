import { getBackendOrigin } from '@/lib/api-config';

/** Turn backend asset URLs into paths the browser can load from the Next app. */
export function resolvePublicAssetUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;

  const trimmed = url.trim();
  if (trimmed.startsWith('/')) return trimmed;

  const origin = getBackendOrigin();
  if (trimmed.startsWith(origin)) {
    return trimmed.slice(origin.length) || null;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  return `/${trimmed.replace(/^\//, '')}`;
}
