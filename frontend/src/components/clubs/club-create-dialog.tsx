'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Icons } from '@/components/icons'
import { useCreateClub, useCreateClubAsDean } from '@/lib/clubs/queries'
import { messagesClubHref } from '@/lib/inbox/services/messages-href'
import type { ClubJoinPolicy } from '@/lib/clubs/types'
import { cn } from '@/lib/utils'

const fieldClass =
  'h-10 rounded-lg border border-border bg-card text-sm text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-[#3B82F6]/20'

const labelClass = 'text-sm font-medium text-foreground'

export interface ClubCreateDialogProps {
  isDean: boolean
  isSuperAdmin: boolean
  /** Trigger button text — callers phrase this differently depending on context. */
  label?: string
}

export function ClubCreateDialog({
  isDean,
  isSuperAdmin,
  label = 'Create Club',
}: ClubCreateDialogProps) {
  const router = useRouter()
  const applyMutation = useCreateClub()
  const directMutation = useCreateClubAsDean()
  const canCreateDirectly = isDean || isSuperAdmin

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [joinPolicy, setJoinPolicy] = useState<ClubJoinPolicy>('BY_REQUEST')
  // Deans/admins default to skipping the approval queue; regular members
  // never see this control since they can't take that path.
  const [createDirectly, setCreateDirectly] = useState(canCreateDirectly)

  const pending = applyMutation.isPending || directMutation.isPending
  const nameValid = name.trim().length >= 3

  const resetForm = () => {
    setName('')
    setTagline('')
    setDescription('')
    setJoinPolicy('BY_REQUEST')
    setCreateDirectly(canCreateDirectly)
  }

  const submit = () => {
    if (!nameValid || pending) return
    const payload = {
      name: name.trim(),
      tagline: tagline.trim() || null,
      description: description.trim() || null,
      joinPolicy,
      // Clubs are faculty-wide only — scope is not user-selectable.
      scopeKind: 'FACULTY' as const,
    }

    const mutation = canCreateDirectly && createDirectly ? directMutation : applyMutation
    mutation.mutate(payload, {
      onSuccess: (result) => {
        setOpen(false)
        resetForm()
        // A pending application has no server yet, but the slug still
        // resolves — the club page shows the pending-approval banner.
        router.push(messagesClubHref(result.club.slug))
      },
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) resetForm()
      }}
    >
      <DialogTrigger asChild>
        <Button
          size='sm'
          className='h-8 gap-1 rounded-full bg-primary px-3.5 text-xs font-medium text-white transition-all duration-200 hover:bg-[#2563EB] hover:shadow'
        >
          <Icons.add className='size-3.5' />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className='gap-5 border-border sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='text-lg font-semibold text-foreground'>
            Create a club
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='space-y-1.5'>
            <Label htmlFor='club-name' className={labelClass}>
              Club name
            </Label>
            <Input
              id='club-name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. Robotics Club'
              maxLength={80}
              className={fieldClass}
            />
            {name.length > 0 && !nameValid ? (
              <p className='text-xs font-medium text-destructive'>
                Name must be at least 3 characters.
              </p>
            ) : null}
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='club-tagline' className={labelClass}>
              Tagline (optional)
            </Label>
            <Input
              id='club-tagline'
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder='A short one-liner'
              maxLength={80}
              className={fieldClass}
            />
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='club-description' className={labelClass}>
              Description (optional)
            </Label>
            <Textarea
              id='club-description'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='What is this club about?'
              rows={3}
              maxLength={500}
              className={cn(
                fieldClass,
                'min-h-[88px] resize-none py-2.5'
              )}
            />
          </div>

          <div className='space-y-1.5'>
            <Label className={labelClass}>Who can join</Label>
            <Select
              value={joinPolicy}
              onValueChange={(v) => setJoinPolicy(v as ClubJoinPolicy)}
            >
              <SelectTrigger className={cn(fieldClass, 'w-full')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className='rounded-lg border-border'>
                <SelectItem value='OPEN'>Open — anyone joins instantly</SelectItem>
                <SelectItem value='BY_REQUEST'>By request — you approve</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {canCreateDirectly ? (
            <label className='flex items-start gap-2.5 rounded-lg border border-border bg-muted p-3 text-sm'>
              <input
                type='checkbox'
                checked={createDirectly}
                onChange={(e) => setCreateDirectly(e.target.checked)}
                className='mt-0.5 size-4 accent-[#3B82F6]'
              />
              <span>
                <span className='font-medium text-foreground'>Create immediately</span>
                <span className='mt-0.5 block text-xs text-muted-foreground'>
                  Skips the approval queue. Uncheck to submit it as a regular application
                  instead.
                </span>
              </span>
            </label>
          ) : (
            <p className='rounded-lg border border-border bg-primary/10 px-3 py-2.5 text-xs font-medium text-[#1D4ED8]'>
              Your club will be created as pending — a dean reviews it before it goes live.
            </p>
          )}
        </div>

        <DialogFooter className='gap-2 sm:gap-2'>
          <Button
            variant='outline'
            onClick={() => setOpen(false)}
            disabled={pending}
            className='h-9 rounded-full border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted hover:text-foreground'
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!nameValid || pending}
            className='h-9 rounded-full bg-primary px-4 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-50'
          >
            {pending ? 'Creating…' : 'Create Club'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ClubCreateDialog
