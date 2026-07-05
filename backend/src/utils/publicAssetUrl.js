/**
 * Normalise stored asset URLs for API responses.
 * Uploads are stored as `/uploads/...` paths so they survive host/port changes.
 */
import fs from "fs";
import path from "path";

export function normalizePublicAssetUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('/')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname.startsWith('/uploads/')) return parsed.pathname;
  } catch {
    // Not a valid absolute URL — fall through.
  }
  return trimmed;
}

/** Default cover when none uploaded (stable Unsplash URLs). */
const DEFAULT_COURSE_COVERS = [
  'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&q=80',
  'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80',
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80',
  'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80',
];

export function defaultCourseCoverForCode(code) {
  const seed = String(code ?? 'course');
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash << 5) - hash + seed.charCodeAt(i);
  return DEFAULT_COURSE_COVERS[Math.abs(hash) % DEFAULT_COURSE_COVERS.length];
}

export function resolveCourseThumbnail(storedThumbnail, courseCode) {
  const normalized = normalizePublicAssetUrl(storedThumbnail);
  if (normalized?.startsWith("/uploads/")) {
    const localPath = path.join(process.cwd(), normalized.slice(1));
    if (fs.existsSync(localPath)) return normalized;
    return defaultCourseCoverForCode(courseCode);
  }
  if (normalized) return normalized;
  return defaultCourseCoverForCode(courseCode);
}
