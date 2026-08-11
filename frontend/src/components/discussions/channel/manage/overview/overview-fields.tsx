'use client'

import { Input } from '@/features/ui/components/input'
import { Label } from '@/features/ui/components/label'
import { Textarea } from '@/features/ui/components/textarea'
import { NAME_MAX, TOPIC_MAX } from './constants'

export function OverviewFields({
  name,
  setName,
  topic,
  setTopic,
  isArchived,
}: {
  name: string
  setName: (v: string) => void
  topic: string
  setTopic: (v: string) => void
  isArchived: boolean
}) {
  return (
    <div className='space-y-4'>
      <div className='space-y-1.5'>
        <Label
          htmlFor='channel-name'
          className='text-sm font-semibold text-[#101828]'
        >
          Name
        </Label>
        <Input
          id='channel-name'
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
          placeholder='channel-name'
          disabled={isArchived}
          maxLength={NAME_MAX}
          className='h-10 rounded-lg border-[#E5E7EB] text-[#101828] placeholder:text-[#9CA3AF]'
        />
      </div>

      <div className='space-y-1.5'>
        <Label
          htmlFor='channel-topic'
          className='text-sm font-semibold text-[#101828]'
        >
          Topic
        </Label>
        <Textarea
          id='channel-topic'
          value={topic}
          onChange={(e) => setTopic(e.target.value.slice(0, TOPIC_MAX))}
          placeholder='Optional — what is this channel for?'
          disabled={isArchived}
          rows={2}
          maxLength={TOPIC_MAX}
          className='resize-none rounded-lg border-[#E5E7EB] text-[#101828] placeholder:text-[#9CA3AF]'
        />
      </div>
    </div>
  )
}
