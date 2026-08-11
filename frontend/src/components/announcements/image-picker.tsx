'use client';

import { useRef, useState, useCallback } from 'react';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import {
  ACCEPTED_IMAGE_TYPES,
  createImagePreview,
  newImageId,
  validateImageFile,
  type ImageFile,
} from './image-picker-utils';
import { ImagePickerPreviewList } from './image-picker-preview-list';

interface ImagePickerProps {
  images: ImageFile[];
  onImagesChange: (images: ImageFile[]) => void;
  maxImages?: number;
  className?: string;
}

export function ImagePicker({
  images,
  onImagesChange,
  maxImages = 5,
  className,
}: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      setError(null);
      if (!files || files.length === 0) return;

      const remainingSlots = maxImages - images.length;
      if (remainingSlots <= 0) {
        setError(`Maximum ${maxImages} images allowed`);
        return;
      }

      const newImages: ImageFile[] = [];
      for (const file of Array.from(files).slice(0, remainingSlots)) {
        const validationError = validateImageFile(file);
        if (validationError) {
          setError(validationError);
          continue;
        }
        newImages.push({ id: newImageId(), file, preview: createImagePreview(file) });
      }

      if (newImages.length > 0) onImagesChange([...images, ...newImages]);
    },
    [images, maxImages, onImagesChange]
  );

  const removeImage = useCallback(
    (id: string) => {
      const imageToRemove = images.find((img) => img.id === id);
      if (imageToRemove) URL.revokeObjectURL(imageToRemove.preview);
      onImagesChange(images.filter((img) => img.id !== id));
    },
    [images, onImagesChange]
  );

  return (
    <div className={cn('space-y-3', className)}>
      <input
        ref={inputRef}
        type='file'
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        multiple
        className='hidden'
        onChange={(e) => handleFiles(e.target.files)}
      />

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
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
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

      {error && <p className='text-sm text-red-600'>{error}</p>}

      <ImagePickerPreviewList
        images={images}
        maxImages={maxImages}
        onImagesChange={onImagesChange}
        onRemove={removeImage}
      />
    </div>
  );
}

export type { ImageFile } from './image-picker-utils';
