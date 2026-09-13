export type AttachmentCardModel = {
  id: string
  url?: string
  accessUrl?: string
  fileType: string
  mimeType?: string
  size?: number
  isE2EE?: boolean
}

export function isImageAttachment(att: AttachmentCardModel): boolean {
  const type = String(att.fileType || '').toUpperCase()
  if (type === 'IMAGE') return true
  return (att.mimeType || '').startsWith('image/')
}

export function typeIconLabel(fileType: string): {
  label: string
  className: string
} {
  const u = String(fileType || '').toUpperCase()
  if (u === 'IMAGE')
    return { label: 'IMG', className: 'text-emerald-700 ring-emerald-500/30' }
  if (u === 'VIDEO')
    return { label: 'VID', className: 'text-violet-700 ring-violet-500/35' }
  return { label: 'FILE', className: 'text-rose-700 ring-rose-500/30' }
}

export function fileNameFromUrl(url: string): string {
  try {
    const u = new URL(url, 'http://local')
    const seg = u.pathname.split('/').pop() || 'file'
    return decodeURIComponent(seg)
  } catch {
    return 'file'
  }
}

export function formatSize(n?: number | null): string {
  if (n == null || !Number.isFinite(n) || n < 0) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Prefer same-origin `/uploads/...` (Next rewrite) so chat previews are not
 * blocked by Cross-Origin-Resource-Policy on the API host.
 */
export function resolveAttachmentSrc(att: AttachmentCardModel): string | null {
  const raw = att.url || att.accessUrl || ''
  if (!raw) return null
  try {
    const u = new URL(raw, 'http://local')
    if (u.pathname.startsWith('/uploads/')) return u.pathname
  } catch {
    /* ignore */
  }
  if (raw.startsWith('/uploads/')) return raw
  return att.accessUrl || att.url || null
}
