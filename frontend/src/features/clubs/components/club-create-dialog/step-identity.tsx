'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { THEME_COLORS } from './constants'

export function StepIdentity({
  name,
  slug,
  tagline,
  themeColor,
  onNameChange,
  onSlugChange,
  onTaglineChange,
  onThemeColorChange,
}: {
  name: string
  slug: string
  tagline: string
  themeColor: string
  onNameChange: (v: string) => void
  onSlugChange: (v: string) => void
  onTaglineChange: (v: string) => void
  onThemeColorChange: (v: string) => void
}) {
  return (
    <div className='space-y-3'>
      <div className='space-y-1.5'>
        <Label htmlFor='club-name'>Club Name *</Label>
        <Input
          id='club-name'
          placeholder='e.g. Robotics Club'
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          maxLength={80}
        />
      </div>
      <div className='space-y-1.5'>
        <Label htmlFor='club-slug'>Slug</Label>
        <Input
          id='club-slug'
          placeholder='robotics-club'
          value={slug}
          onChange={(e) => onSlugChange(e.target.value)}
          maxLength={32}
        />
        <p className='text-[10px] text-muted-foreground'>
          URL: /dashboard/clubs/{slug || '...'}
        </p>
      </div>
      <div className='space-y-1.5'>
        <Label htmlFor='club-tagline'>Tagline</Label>
        <Input
          id='club-tagline'
          placeholder='Build & break things'
          value={tagline}
          onChange={(e) => onTaglineChange(e.target.value)}
          maxLength={80}
        />
      </div>
      <div className='space-y-1.5'>
        <Label>Theme Color</Label>
        <div className='flex flex-wrap gap-1.5'>
          {THEME_COLORS.map((c) => (
            <button
              key={c}
              type='button'
              className='h-6 w-6 rounded-full border-2 transition-transform hover:scale-110'
              style={{
                backgroundColor: c,
                borderColor: c === themeColor ? 'var(--foreground)' : 'transparent',
              }}
              onClick={() => onThemeColorChange(c)}
              aria-label={c}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
