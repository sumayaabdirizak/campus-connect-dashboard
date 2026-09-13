'use client'

import { useRef, useState } from 'react'
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
import { useEditClub } from '@/lib/clubs/queries'
import type { Club, ClubJoinPolicy } from '@/lib/clubs/types'
import { useQueryClient } from '@/lib/async-query'
import { clubKeys } from '@/lib/clubs/queries/club-keys'
import { uploadJson } from '@/lib/upload-client'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'

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
  const qc = useQueryClient()

  const bannerInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingBanner(true)
    const form = new FormData()
    form.append('banner', file)
    try {
      await uploadJson(`/clubs/${club.id}/banner`, form)
      qc.invalidateQueries({ queryKey: clubKeys.all })
      toast.success('Banner updated successfully')
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload banner')
    } finally {
      setIsUploadingBanner(false)
      if (bannerInputRef.current) bannerInputRef.current.value = ''
    }
  }

  const handleRemoveBanner = async () => {
    try {
      await apiClient(`/clubs/${club.id}/banner`, { method: 'DELETE' })
      qc.invalidateQueries({ queryKey: clubKeys.all })
      toast.success('Banner removed successfully')
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove banner')
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingAvatar(true)
    const form = new FormData()
    form.append('icon', file)
    try {
      await uploadJson(`/clubs/${club.id}/icon`, form)
      qc.invalidateQueries({ queryKey: clubKeys.all })
      toast.success('Avatar updated successfully')
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload avatar')
    } finally {
      setIsUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const handleRemoveAvatar = async () => {
    try {
      await apiClient(`/clubs/${club.id}/icon`, { method: 'DELETE' })
      qc.invalidateQueries({ queryKey: clubKeys.all })
      toast.success('Avatar removed successfully')
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove avatar')
    }
  }

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

  const initials = club.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

  return (
    <div className='space-y-6'>
      <input
        type='file'
        ref={bannerInputRef}
        onChange={handleBannerUpload}
        accept='image/*'
        className='hidden'
      />
      <input
        type='file'
        ref={avatarInputRef}
        onChange={handleAvatarUpload}
        accept='image/*'
        className='hidden'
      />

      <div className='rounded-xl border border-border bg-muted/50 p-1 overflow-hidden'>
        <div
          className='relative h-32 w-full overflow-hidden rounded-xl bg-slate-200'
          style={
            club.bannerUrl
              ? { backgroundImage: `url(${club.bannerUrl})`, backgroundPosition: 'center', backgroundSize: 'cover' }
              : { background: `linear-gradient(135deg, ${themeColor}50, ${themeColor}20, transparent)` }
          }
        />
        <div className='flex items-end gap-3 px-4 pb-2 -mt-8 relative z-10'>
          <div className='flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-white bg-card shadow-md overflow-hidden p-0.5'>
            {club.iconUrl ? (
              <img src={club.iconUrl} alt='' className='h-full w-full rounded-lg object-cover' />
            ) : (
              <div
                className='flex h-full w-full items-center justify-center rounded-lg font-bold text-white text-lg'
                style={{ backgroundColor: themeColor }}
              >
                {initials}
              </div>
            )}
          </div>
          <div className='pb-1'>
            <h3 className='font-bold text-foreground leading-none'>{name || club.name}</h3>
            {tagline && (
              <p className='text-xs text-muted-foreground mt-1 leading-none'>{tagline}</p>
            )}
          </div>
        </div>
      </div>

      <div className='space-y-4 py-2 border-b border-border pb-6'>
        <div className='flex items-center gap-4'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => bannerInputRef.current?.click()}
            disabled={isUploadingBanner}
            className='flex items-center gap-1.5 text-xs font-semibold'
          >
            <Upload className='h-3.5 w-3.5' />
            {isUploadingBanner ? 'Uploading...' : 'Change banner'}
          </Button>
          {club.bannerUrl && (
            <button
              type='button'
              onClick={handleRemoveBanner}
              className='text-xs text-muted-foreground hover:text-red-600 hover:underline'
            >
              Remove banner
            </button>
          )}
        </div>

        <div className='flex items-center flex-wrap gap-x-4 gap-y-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => avatarInputRef.current?.click()}
            disabled={isUploadingAvatar}
            className='flex items-center gap-1.5 text-xs font-semibold'
          >
            <Upload className='h-3.5 w-3.5' />
            {isUploadingAvatar ? 'Uploading...' : 'Change avatar'}
          </Button>
          {club.iconUrl && (
            <button
              type='button'
              onClick={handleRemoveAvatar}
              className='text-xs text-muted-foreground hover:text-red-600 hover:underline'
            >
              Remove avatar
            </button>
          )}
          <span className='text-[10px] text-muted-foreground'>
            PNG, JPG, WebP or GIF · max 5 MB
          </span>
        </div>
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='space-y-1.5'>
          <Label htmlFor='club-name'>Club name</Label>
          <Input
            id='club-name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className='h-9 rounded-lg border-border'
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
            className='h-9 rounded-lg border-border'
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
          className='rounded-lg border-border'
        />
        <p className='text-[10px] text-muted-foreground text-right'>
          {description.length}/500
        </p>
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='space-y-1.5'>
          <Label>Join Policy</Label>
          <Select
            value={joinPolicy}
            onValueChange={(v) => setJoinPolicy(v as ClubJoinPolicy)}
            disabled={!isOwner}
          >
            <SelectTrigger className='h-9 rounded-lg border-border'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className='rounded-lg'>
              <SelectItem value='OPEN'>Open — anyone can join</SelectItem>
              <SelectItem value='BY_REQUEST'>By Request — requires approval</SelectItem>
            </SelectContent>
          </Select>
          {!isOwner && (
            <p className='text-[10px] text-muted-foreground'>
              Only the club owner can change the join policy
            </p>
          )}
        </div>

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

      <div className='flex justify-end pt-2'>
        <Button
          onClick={handleSave}
          disabled={!isDirty || editMutation.isPending}
          style={isDirty ? { backgroundColor: themeColor } : undefined}
          className='rounded-lg px-6'
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
