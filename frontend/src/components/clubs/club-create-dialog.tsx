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
import type { ClubJoinPolicy, ClubScopeKind } from '@/lib/clubs/types'

export interface ClubCreateDialogProps {
  isDean: boolean
  isSuperAdmin: boolean
}

export function ClubCreateDialog({ isDean, isSuperAdmin }: ClubCreateDialogProps) {
  const router = useRouter()
  const applyMutation = useCreateClub()
  const directMutation = useCreateClubAsDean()
  const canCreateDirectly = isDean || isSuperAdmin

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [joinPolicy, setJoinPolicy] = useState<ClubJoinPolicy>('BY_REQUEST')
  const [scopeKind, setScopeKind] = useState<ClubScopeKind>('UNIVERSITY')
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
    setScopeKind('UNIVERSITY')
    setCreateDirectly(canCreateDirectly)
  }

  const submit = () => {
    if (!nameValid || pending) return
    const payload = {
      name: name.trim(),
      tagline: tagline.trim() || null,
      description: description.trim() || null,
      joinPolicy,
      scopeKind,
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
        <Button size='sm' className='gap-1.5'>
          <Icons.add className='h-4 w-4' />
          Create Club
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Create a club</DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='space-y-1.5'>
            <Label htmlFor='club-name'>Club name</Label>
            <Input
              id='club-name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. Robotics Club'
              maxLength={80}
            />
            {name.length > 0 && !nameValid ? (
              <p className='text-xs text-destructive'>Name must be at least 3 characters.</p>
            ) : null}
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='club-tagline'>Tagline (optional)</Label>
            <Input
              id='club-tagline'
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder='A short one-liner'
              maxLength={80}
            />
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='club-description'>Description (optional)</Label>
            <Textarea
              id='club-description'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='What is this club about?'
              rows={3}
              maxLength={500}
            />
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-1.5'>
              <Label>Who can join</Label>
              <Select value={joinPolicy} onValueChange={(v) => setJoinPolicy(v as ClubJoinPolicy)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='OPEN'>Open — anyone joins instantly</SelectItem>
                  <SelectItem value='BY_REQUEST'>By request — you approve</SelectItem>
                  <SelectItem value='INVITE_ONLY'>Invite only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-1.5'>
              <Label>Scope</Label>
              <Select value={scopeKind} onValueChange={(v) => setScopeKind(v as ClubScopeKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='UNIVERSITY'>University-wide</SelectItem>
                  <SelectItem value='FACULTY'>My faculty</SelectItem>
                  <SelectItem value='CROSS'>Cross-faculty</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {canCreateDirectly ? (
            <label className='flex items-start gap-2 rounded-lg border p-3 text-sm'>
              <input
                type='checkbox'
                checked={createDirectly}
                onChange={(e) => setCreateDirectly(e.target.checked)}
                className='mt-0.5'
              />
              <span>
                <span className='font-medium'>Create immediately</span>
                <span className='block text-xs text-muted-foreground'>
                  Skips the approval queue. Uncheck to submit it as a regular application instead.
                </span>
              </span>
            </label>
          ) : (
            <p className='rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground'>
              Your club will be created as pending — a dean reviews it before it goes live.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!nameValid || pending}>
            {pending ? 'Creating...' : 'Create Club'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ClubCreateDialog
