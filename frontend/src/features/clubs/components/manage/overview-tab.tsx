'use client'

import { useState } from 'react'
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
import { Icons } from '@/components/icons'
import { useEditClub } from '../../api/queries'
import type { Club, ClubJoinPolicy } from '../../api/types'

const THEME_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#6b7280', '#1e293b',
]

export function OverviewTab({
  club,
  isOwner,
}: {
  club: Club
  isOwner: boolean
}) {
  const [name, setName] = useState(club.name)
  const [tagline, setTagline] = useState(club.tagline ?? '')
  const [description, setDescription] = useState(club.description ?? '')
  const [joinPolicy, setJoinPolicy] = useState<ClubJoinPolicy>(club.joinPolicy)
  const [themeColor, setThemeColor] = useState(club.themeColor || '#6366f1')

  const editMutation = useEditClub()

  const isDirty =
    name !== club.name ||
    tagline !== (club.tagline ?? '') ||
    description !== (club.description ?? '') ||
    joinPolicy !== club.joinPolicy ||
    themeColor !== (club.themeColor || '#6366f1')

  const handleSave = () => {
    const data: Record<string, unknown> = {}
    if (name !== club.name) data.name = name.trim()
    if (tagline !== (club.tagline ?? '')) data.tagline = tagline.trim() || null
    if (description !== (club.description ?? '')) data.description = description.trim() || null
    if (joinPolicy !== club.joinPolicy && isOwner) data.joinPolicy = joinPolicy
    if (themeColor !== (club.themeColor || '#6366f1')) data.themeColor = themeColor

    editMutation.mutate({ clubId: club.id, data })
  }

  return (
    <div className='space-y-6'>
      {/* Banner preview */}
      <div
        className='relative h-32 w-full overflow-hidden rounded-lg'
        style={{
          background: club.bannerUrl
            ? `url(${club.bannerUrl}) center/cover`
            : `linear-gradient(135deg, ${themeColor}50, ${themeColor}20, transparent)`,
        }}
      >
        <div className='absolute inset-0 flex items-end p-4'>
          <div className='flex items-center gap-3'>
            <div
              className='flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold'
              style={{ backgroundColor: `${themeColor}30`, color: themeColor }}
            >
              {club.name
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase())
                .join('')}
            </div>
            <div>
              <p className='font-semibold text-foreground drop-shadow-sm'>{name || club.name}</p>
              {tagline && (
                <p className='text-xs text-muted-foreground drop-shadow-sm'>{tagline}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='space-y-1.5'>
          <Label htmlFor='club-name'>Club Name</Label>
          <Input
            id='club-name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='club-tagline'>Tagline</Label>
          <Input
            id='club-tagline'
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            maxLength={80}
            placeholder='Short description'
          />
        </div>
      </div>

      <div className='space-y-1.5'>
        <Label htmlFor='club-desc'>Description</Label>
        <Textarea
          id='club-desc'
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder='What is this club about?'
        />
        <p className='text-[10px] text-muted-foreground text-right'>
          {description.length}/500
        </p>
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        {/* Join policy — owner only */}
        <div className='space-y-1.5'>
          <Label>Join Policy</Label>
          <Select
            value={joinPolicy}
            onValueChange={(v) => setJoinPolicy(v as ClubJoinPolicy)}
            disabled={!isOwner}
          >
            <SelectTrigger className='h-9'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='OPEN'>Open — anyone can join</SelectItem>
              <SelectItem value='BY_REQUEST'>By Request — requires approval</SelectItem>
              <SelectItem value='INVITE_ONLY'>Invite Only</SelectItem>
            </SelectContent>
          </Select>
          {!isOwner && (
            <p className='text-[10px] text-muted-foreground'>
              Only the club owner can change the join policy
            </p>
          )}
        </div>

        {/* Theme color */}
        <div className='space-y-1.5'>
          <Label>Theme Color</Label>
          <div className='flex flex-wrap gap-2'>
            {THEME_COLORS.map((c) => (
              <button
                key={c}
                type='button'
                className='h-7 w-7 rounded-full border-2 transition-transform hover:scale-110'
                style={{
                  backgroundColor: c,
                  borderColor: c === themeColor ? 'var(--foreground)' : 'transparent',
                }}
                onClick={() => setThemeColor(c)}
                aria-label={c}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Save */}
      <div className='flex justify-end'>
        <Button
          onClick={handleSave}
          disabled={!isDirty || editMutation.isPending}
          style={isDirty ? { backgroundColor: themeColor } : undefined}
        >
          {editMutation.isPending ? (
            <>
              <Icons.spinner className='mr-1.5 h-3.5 w-3.5 animate-spin' />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  )
}
