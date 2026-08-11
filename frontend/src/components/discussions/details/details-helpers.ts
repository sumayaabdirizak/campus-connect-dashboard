export function initialsFor(name: string | null | undefined): string {
  const source = name?.trim() ?? ''
  if (!source) return '?'
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function formatSize(n?: number | null): string {
  if (n == null || !Number.isFinite(n) || n < 0) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function fileNameFromUrl(url?: string): string {
  if (!url) return 'file'
  try {
    const u = new URL(url, 'http://local')
    const seg = u.pathname.split('/').pop() || 'file'
    return decodeURIComponent(seg)
  } catch {
    return 'file'
  }
}
