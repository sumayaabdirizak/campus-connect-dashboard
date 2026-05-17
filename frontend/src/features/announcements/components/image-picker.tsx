'use client';

import { useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

interface ImageFile {
  id: string;
  /** Local upload; omitted for images already persisted on the server (draft resume). */
  file?: File;
  preview: string;
  /** WCAG 1.1.1: short description for screen-reader users. Stored in AnnouncementAttachment.altText. */
  altText?: string;
}

interface ImagePickerProps {
  images: ImageFile[];
  onImagesChange: (images: ImageFile[]) => void;
  maxImages?: number;
  className?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function ImagePicker({
  images,
  onImagesChange,
  maxImages = 5,
  className
}: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Only JPEG, PNG, GIF, and WebP images are allowed';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'Image must be less than 5MB';
    }
    return null;
  }, []);

  const createPreview = useCallback((file: File): string => {
    return URL.createObjectURL(file);
  }, []);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      setError(null);

      if (!files || files.length === 0) return;

      const currentCount = images.length;
      const remainingSlots = maxImages - currentCount;

      if (remainingSlots <= 0) {
        setError(`Maximum ${maxImages} images allowed`);
        return;
      }

      const filesToAdd = Array.from(files).slice(0, remainingSlots);
      const newImages: ImageFile[] = [];

      for (const file of filesToAdd) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          continue;
        }

        const preview = createPreview(file);
        newImages.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          preview
        });
      }

      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
      }
    },
    [images, maxImages, onImagesChange, validateFile, createPreview]
  );

  const removeImage = useCallback(
    (id: string) => {
      const imageToRemove = images.find((img) => img.id === id);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      onImagesChange(images.filter((img) => img.id !== id));
    },
    [images, onImagesChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div className={cn('space-y-3', className)}>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type='file'
        accept={ACCEPTED_TYPES.join(',')}
        multiple
        className='hidden'
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Drop zone / Add button */}
      {images.length < maxImages && (
        <div
          role='button'
          tabIndex={0}
          aria-label='Upload images'
          className={cn(
            'relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/50',
            error && 'border-destructive/50 bg-destructive/5'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          <div className='flex size-12 items-center justify-center rounded-full bg-primary/10'>
            <Icons.media className='size-6 text-primary' />
          </div>
          <div className='text-center'>
            <p className='text-sm font-medium text-foreground'>
              <span className='text-primary'>Click to upload</span> or drag and drop
            </p>
            <p className='mt-1 text-xs text-muted-foreground'>
              JPEG, PNG, GIF, WebP up to 5MB • Max {maxImages} images
            </p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && <p className='text-sm text-red-600'>{error}</p>}

      {/* Image previews + alt-text inputs */}
      {images.length > 0 && (
        <ul className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
          {images.map((img, idx) => (
            <li
              key={img.id}
              className='flex items-start gap-3 rounded-lg border border-border bg-background p-2'
            >
              <div className='relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted'>
                <Image
                  src={img.preview}
                  alt={img.altText || `Image ${idx + 1} preview`}
                  fill
                  unoptimized
                  className='object-cover'
                />
              </div>
              <div className='min-w-0 flex-1 space-y-1.5'>
                <label
                  htmlFor={`announcement-alt-${img.id}`}
                  className='block text-xs font-medium text-foreground'
                >
                  Alt text
                  <span className='ms-1 text-muted-foreground'>(describe the image)</span>
                </label>
                <input
                  id={`announcement-alt-${img.id}`}
                  type='text'
                  maxLength={150}
                  value={img.altText ?? ''}
                  onChange={(e) =>
                    onImagesChange(
                      images.map((existing) =>
                        existing.id === img.id ? { ...existing, altText: e.target.value } : existing
                      )
                    )
                  }
                  aria-describedby={`announcement-alt-help-${img.id}`}
                  placeholder='e.g. Faculty hall with students seated for orientation'
                  className='block w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                />
                <p
                  id={`announcement-alt-help-${img.id}`}
                  className='text-[11px] text-muted-foreground'
                >
                  Required for screen-reader users. Leave empty only if the image is purely decorative.
                </p>
              </div>
              <button
                type='button'
                aria-label={`Remove image ${idx + 1}`}
                className='flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(img.id);
                }}
              >
                <Icons.close className='size-4' aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Image count indicator */}
      {images.length > 0 && images.length < maxImages && (
        <p className='text-xs text-gray-500'>
          {images.length} of {maxImages} images added
        </p>
      )}
    </div>
  );
}
