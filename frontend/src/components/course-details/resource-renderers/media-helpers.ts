import type { Resource } from '@/lib/course-details/types';

export function isYoutubeUrl(url: string) {
  return /(?:youtube\.com\/watch|youtu\.be\/)/i.test(url);
}

export function toYoutubeEmbed(url: string) {
  const watch = url.match(/[?&]v=([\w-]+)/);
  if (watch) return `https://www.youtube.com/embed/${watch[1]}`;
  const short = url.match(/youtu\.be\/([\w-]+)/);
  if (short) return `https://www.youtube.com/embed/${short[1]}`;
  return url;
}

export function isAudio(resource: Resource) {
  return (
    resource.type === 'AUDIO' ||
    (resource.mimeType ?? '').startsWith('audio/') ||
    /\.(mp3|wav|ogg|flac|aac|m4a)$/i.test(resource.url)
  );
}

export function isUploadedVideo(resource: Resource) {
  return (
    !!resource.originalName &&
    (resource.type === 'VIDEO' ||
      (resource.mimeType ?? '').startsWith('video/') ||
      /\.(mp4|mov|mkv|webm)$/i.test(resource.url))
  );
}

export function isUploadedAudio(resource: Resource) {
  return !!resource.originalName && isAudio(resource);
}

export function isTrackableMedia(resource: Resource) {
  return isUploadedVideo(resource) || isUploadedAudio(resource);
}

export function humanizeType(type: Resource['type']): string {
  switch (type) {
    case 'SYLLABUS':
      return 'Syllabus';
    case 'ASSIGNMENT':
      return 'Assignment';
    case 'LECTURE_NOTE':
      return 'File';
    case 'VIDEO':
      return 'Video';
    case 'AUDIO':
      return 'Audio';
    case 'EXTERNAL_LINK':
      return 'Link';
    case 'OTHER':
      return 'Other';
    default:
      return type;
  }
}
