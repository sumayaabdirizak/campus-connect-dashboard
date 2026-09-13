'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/features/ui/components/button'
import { Icons } from '@/components/icons'

/** Full-screen image view (no download) for chat attachments. */
export function DiscussionImageLightbox({
  src,
  alt,
  open,
  onOpenChange,
}: {
  src: string
  alt?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  if (!open || !src) return null

  return (
    <div role='dialog' aria-modal='true' aria-label={alt || 'Image'}>
      <div
        aria-hidden
        className='fixed inset-0 z-50 bg-black/90 backdrop-blur-sm'
        onClick={() => onOpenChange(false)}
      />
      <Button
        ref={closeRef}
        variant='ghost'
        size='icon'
        aria-label='Close'
        className='fixed top-4 right-4 z-50 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70'
        onClick={() => onOpenChange(false)}
      >
        <Icons.close className='size-5' aria-hidden />
      </Button>
      <div className='pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-6'>
        <div className='pointer-events-auto max-h-full max-w-full'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt || 'Attachment'}
            className='max-h-[85vh] w-auto max-w-[min(100vw-3rem,960px)] rounded-lg object-contain shadow-2xl'
          />
        </div>
      </div>
    </div>
  )
}
