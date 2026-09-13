'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/features/ui/components/avatar'
import { Button } from '@/features/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/features/ui/components/dialog'
import { Input } from '@/features/ui/components/input'
import { Label } from '@/features/ui/components/label'
import { Icons } from '@/components/icons'
import { ImageIcon, Loader2, RefreshCcw, Trash2 } from 'lucide-react'
import { resolvePublicAssetUrl } from '@/lib/resolve-public-asset-url'
import {
  useRemoveGroupDmIcon,
  useRenameGroupDm,
  useUploadGroupDmIcon
} from '@/lib/discussions/queries/queries'
import { initialsFor } from './dm-pane-helpers'

export function RenameDmDialog({
  open,
  onOpenChange,
  groupDmId,
  currentName,
  iconUrl
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  groupDmId: string
  currentName: string
  iconUrl: string | null
}) {
  const [name, setName] = useState(currentName)
  const rename = useRenameGroupDm(groupDmId)
  const uploadIcon = useUploadGroupDmIcon(groupDmId)
  const removeIcon = useRemoveGroupDmIcon(groupDmId)
  const iconInputRef = useRef<HTMLInputElement | null>(null)
  const iconBusy = uploadIcon.isPending || removeIcon.isPending

  useEffect(() => {
    if (open) setName(currentName)
  }, [open, currentName])

  const handleSave = () => {
    if (rename.isPending) return
    rename.mutate(name.trim() || null, { onSuccess: () => onOpenChange(false) })
  }

  const onPickIcon = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2 MB')
      return
    }
    uploadIcon.mutate(file, {
      onSuccess: () => toast.success('Icon updated'),
      onSettled: () => {
        if (iconInputRef.current) iconInputRef.current.value = ''
      }
    })
  }

  const iconSrc = resolvePublicAssetUrl(iconUrl)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Edit conversation</DialogTitle>
          <DialogDescription>
            Change the icon and name shown to everyone in this conversation.
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-wrap items-center gap-3 py-2'>
          <Avatar className='size-16 border border-border bg-muted'>
            {iconSrc ? <AvatarImage src={iconSrc} alt={currentName || 'Group icon'} /> : null}
            <AvatarFallback className='bg-muted text-sm font-semibold text-muted-foreground'>
              {initialsFor(currentName || 'Group') || <ImageIcon className='size-5' />}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className='mb-0.5 text-sm font-semibold text-foreground'>Conversation icon</p>
            <p className='mb-2 text-xs text-muted-foreground'>Image should be below 2MB</p>
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={iconBusy}
                className='h-8 gap-1 text-xs'
                onClick={() => iconInputRef.current?.click()}
              >
                {uploadIcon.isPending ? (
                  <Loader2 className='size-3.5 animate-spin' />
                ) : (
                  <RefreshCcw className='size-3.5' />
                )}
                Change icon
              </Button>
              <Button
                type='button'
                variant='outline'
                size='icon'
                disabled={iconBusy || !iconUrl}
                aria-label='Remove conversation icon'
                className='size-8 rounded-full'
                onClick={() => removeIcon.mutate()}
              >
                {removeIcon.isPending ? (
                  <Loader2 className='size-3.5 animate-spin' />
                ) : (
                  <Trash2 className='size-3.5' />
                )}
              </Button>
              <input
                ref={iconInputRef}
                type='file'
                accept='image/png,image/jpeg,image/webp'
                className='hidden'
                onChange={(e) => onPickIcon(e.target.files?.[0])}
              />
            </div>
          </div>
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='dm-rename-input'>Conversation name</Label>
          <Input
            id='dm-rename-input'
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            placeholder='e.g. Math study group'
          />
          <p className='text-xs text-muted-foreground'>
            Leave blank to use the default member-list name.
          </p>
        </div>

        <DialogFooter className='gap-2 sm:gap-0'>
          <Button variant='ghost' onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handleSave}
            disabled={rename.isPending}
            className='bg-primary text-white hover:bg-[#2563EB]'
          >
            {rename.isPending ? <Icons.spinner className='h-4 w-4 animate-spin' /> : 'Save name'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
