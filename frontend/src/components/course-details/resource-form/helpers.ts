import type { ResourceType } from '@/lib/course-details/types';
import type { ResourceFormValues } from '@/lib/course-details/schemas/resource';

export const blankValues: ResourceFormValues = {
  title: '',
  description: '',
  url: '',
  type: 'LECTURE_NOTE',
  originalName: null,
  mimeType: null,
  moduleId: null,
  is_draft: false
};

export function inferTypeFromMime(mime: string): ResourceType {
  if (mime.startsWith('audio/')) return 'AUDIO';
  if (mime.startsWith('video/')) return 'VIDEO';
  if (mime.includes('pdf')) return 'LECTURE_NOTE';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'LECTURE_NOTE';
  return 'OTHER';
}

export const FILE_ACCEPT =
  'application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/epub+zip,application/zip,image/*,video/*,audio/*,text/*';
