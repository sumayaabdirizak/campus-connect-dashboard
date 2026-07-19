'use client'

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
  DialogFooter,
} from '@/components/ui/dialog'
import { Icons } from '@/components/icons'
import type { DiscussionChannelCategory } from '../../../api/types'
import { NAME_MAX, TOPIC_MAX, UNCATEGORIZED } from './constants'

export function ChannelCreateForm({
  name,
  setName,
  topic,
  setTopic,
  categoryValue,
  setCategoryValue,
  sortedCategories,
  trimmedName,
  slug,
  duplicateName,
  canSubmit,
  createMut,
  onCancel,
  onSubmit,
}: {
  name: string
  setName: (v: string) => void
  topic: string
  setTopic: (v: string) => void
  categoryValue: string
  setCategoryValue: (v: string) => void
  sortedCategories: DiscussionChannelCategory[]
  trimmedName: string
  slug: string
  duplicateName: boolean
  canSubmit: boolean
  createMut: { isPending: boolean }
  onCancel: () => void
  onSubmit: () => void
}) {
  return (
    <>
      <div className='space-y-3'>
        <div className='space-y-1.5'>
          <Label htmlFor='new-channel-name' className='text-xs'>
            Name
          </Label>
          <div className='relative'>
            <span className='pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground'>
              #
            </span>
            <Input
              id='new-channel-name'
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
              placeholder='general'
              autoFocus
              aria-invalid={duplicateName ? 'true' : undefined}
              className='pl-6'
              maxLength={NAME_MAX}
            />
          </div>
          <div className='flex items-center justify-between px-1 text-[10px]'>
            {duplicateName ? (
              <span className='text-destructive'>Name already used.</span>
            ) : slug.length > 0 ? (
              <span className='text-muted-foreground'>
                URL slug: <span className='font-mono'>#{slug}</span>
              </span>
            ) : (
              <span className='text-muted-foreground'>Required</span>
            )}
            <span className='text-muted-foreground'>
              {trimmedName.length}/{NAME_MAX}
            </span>
          </div>
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='new-channel-topic' className='text-xs'>
            Topic <span className='text-muted-foreground'>(optional)</span>
          </Label>
          <Textarea
            id='new-channel-topic'
            value={topic}
            onChange={(e) => setTopic(e.target.value.slice(0, TOPIC_MAX))}
            placeholder='What is this channel about?'
            rows={2}
            maxLength={TOPIC_MAX}
            className='resize-none'
          />
          <div className='flex items-center justify-end px-1 text-[10px] text-muted-foreground'>
            {topic.length}/{TOPIC_MAX}
          </div>
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='new-channel-category' className='text-xs'>
            Category
          </Label>
          <Select value={categoryValue} onValueChange={setCategoryValue}>
            <SelectTrigger id='new-channel-category' className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNCATEGORIZED}>Uncategorized</SelectItem>
              {sortedCategories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button variant='ghost' onClick={onCancel} disabled={createMut.isPending}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={!canSubmit}>
          {createMut.isPending ? (
            <Icons.spinner className='mr-1 h-3.5 w-3.5 animate-spin' />
          ) : null}
          Create channel
        </Button>
      </DialogFooter>
    </>
  )
}
