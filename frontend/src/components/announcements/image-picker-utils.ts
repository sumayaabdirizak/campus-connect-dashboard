export interface ImageFile {
  id: string;
  file?: File;
  preview: string;
  altText?: string;
}

export const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Only JPEG, PNG, GIF, and WebP images are allowed';
  }
  if (file.size > MAX_IMAGE_FILE_SIZE) {
    return 'Image must be less than 5MB';
  }
  return null;
}

export function createImagePreview(file: File): string {
  return URL.createObjectURL(file);
}

export function newImageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
