'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Icons } from '@/components/icons'
import { useCreateClub, useCreateClubAsDean } from '../api/queries'
import { useGroupDmCandidates } from '@/features/discussions/api/queries'
import type { ClubJoinPolicy, ClubScopeKind, CreateClubPayload } from '../api/types'

const STUDENT_STEPS = ['Identity', 'Scope & Rules', 'Review'] as const
const DEAN_STEPS = ['Identity', 'Scope & Rules', 'Moderators', 'Review'] as const

export function ClubCreateDialog({
  trigger,
  isDean = false,
  defaultFacultyId,
}: {
  trigger?: React.ReactNode
  isDean?: boolean
  defaultFacultyId?: number
}) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<number>(0)

  // Form state
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [rules, setRules] = useState('')
  const [joinPolicy, setJoinPolicy] = useState<ClubJoinPolicy>('BY_REQUEST')
  const [scopeKind, setScopeKind] = useState<ClubScopeKind>('FACULTY')
  const [themeColor, setThemeColor] = useState('#6366f1')
  const [moderatorIds, setModeratorIds] = useState<number[]>([])
  const [modSearch, setModSearch] = useState('')

  const createClubMutation = useCreateClub()
  const createAsDeanMutation = useCreateClubAsDean()
  const mutation = isDean ? createAsDeanMutation : createClubMutation

  const STEPS = isDean ? DEAN_STEPS : STUDENT_STEPS

  // User search for moderator picker
  const { data: candidatesData } = useGroupDmCandidates(modSearch)
  const candidates = useMemo(() => {
    const results = candidatesData?.results ?? []
    return results.filter((u) => !moderatorIds.includes(u.id))
  }, [candidatesData, moderatorIds])

  const selectedMods = useMemo(() => {
    return candidatesData?.results?.filter((u) => moderatorIds.includes(u.id)) ?? []
  }, [candidatesData, moderatorIds])

  const addMod = useCallback((userId: number) => {
    setModeratorIds((prev) => [...prev, userId])
  }, [])

  const removeMod = useCallback((userId: number) => {
    setModeratorIds((prev) => prev.filter((id) => id !== userId))
  }, [])

  const deriveSlug = (n: string) =>
    n
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 32)

  const handleNameChange = (val: string) => {
    setName(val)
    if (!slug || slug === deriveSlug(name)) {
      setSlug(deriveSlug(val))
    }
  }

  const reset = () => {
    setStep(0)
    setName('')
    setSlug('')
    setTagline('')
    setDescription('')
    setRules('')
    setJoinPolicy('BY_REQUEST')
    setScopeKind('FACULTY')
    setThemeColor('#6366f1')
    setModeratorIds([])
    setModSearch('')
  }

  const handleSubmit = () => {
    const payload: CreateClubPayload = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      tagline: tagline.trim() || undefined,
      description: description.trim() || undefined,
      rules: rules.trim() || undefined,
      joinPolicy,
      scopeKind,
      themeColor,
      facultyId: defaultFacultyId,
      moderatorUserIds: isDean ? moderatorIds : undefined,
    }

    mutation.mutate(payload, {
      onSuccess: () => {
        setOpen(false)
        reset()
      },
    })
  }

  const canProceed = step === 0 ? name.trim().length >= 3 : true

  const THEME_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
    '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#06b6d4', '#3b82f6', '#6b7280', '#1e293b',
  ]

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size='sm' variant='outline' className='gap-1.5'>
            <Icons.add className='h-4 w-4' />
            {isDean ? 'Create Club' : 'Apply for Club'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>
            {isDean ? 'Create a Club' : 'Apply for a Club'}
          </DialogTitle>
          <DialogDescription>
            {isDean
              ? 'Create a club directly as a dean. It will be immediately active.'
              : 'Submit a club application. A dean will review and approve it.'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className='flex gap-1'>
          {STEPS.map((s, i) => (
            <div
              key={s}
              className='h-1 flex-1 rounded-full transition-colors'
              style={{
                backgroundColor: i <= step ? themeColor : 'var(--border)',
              }}
            />
          ))}
        </div>
        <p className='text-xs text-muted-foreground'>
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>

        {/* Step 0: Identity */}
        {step === 0 && (
          <div className='space-y-3'>
            <div className='space-y-1.5'>
              <Label htmlFor='club-name'>Club Name *</Label>
              <Input
                id='club-name'
                placeholder='e.g. Robotics Club'
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                maxLength={80}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='club-slug'>Slug</Label>
              <Input
                id='club-slug'
                placeholder='robotics-club'
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
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
                onChange={(e) => setTagline(e.target.value)}
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
                    onClick={() => setThemeColor(c)}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Scope & Rules */}
        {step === 1 && (
          <div className='space-y-3'>
            <div className='space-y-1.5'>
              <Label htmlFor='club-description'>Description</Label>
              <Textarea
                id='club-description'
                placeholder='What is this club about?'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='club-rules'>Rules</Label>
              <Textarea
                id='club-rules'
                placeholder='Club rules and guidelines (markdown supported)'
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                maxLength={4000}
                rows={4}
              />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label>Join Policy</Label>
                <Select value={joinPolicy} onValueChange={(v) => setJoinPolicy(v as ClubJoinPolicy)}>
                  <SelectTrigger className='h-8 text-xs'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='OPEN'>Open</SelectItem>
                    <SelectItem value='BY_REQUEST'>By Request</SelectItem>
                    <SelectItem value='INVITE_ONLY'>Invite Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-1.5'>
                <Label>Scope</Label>
                <Select value={scopeKind} onValueChange={(v) => setScopeKind(v as ClubScopeKind)}>
                  <SelectTrigger className='h-8 text-xs'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='FACULTY'>Faculty</SelectItem>
                    {isDean && <SelectItem value='UNIVERSITY'>University</SelectItem>}
                    {isDean && <SelectItem value='CROSS'>Cross-faculty</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Step: Moderators (dean only) */}
        {STEPS[step] === 'Moderators' && (
          <div className='space-y-3'>
            <div className='space-y-1.5'>
              <Label>Assign Moderators</Label>
              <p className='text-xs text-muted-foreground'>
                Search for users to assign as moderators. They&apos;ll be notified when the club is created.
              </p>
              <Input
                placeholder='Search by name or email...'
                value={modSearch}
                onChange={(e) => setModSearch(e.target.value)}
                className='h-8'
              />
            </div>

            {/* Selected moderators */}
            {moderatorIds.length > 0 && (
              <div className='flex flex-wrap gap-1.5'>
                {selectedMods.map((u) => (
                  <Badge
                    key={u.id}
                    variant='secondary'
                    className='gap-1 pr-1'
                  >
                    {u.full_name}
                    <button
                      type='button'
                      onClick={() => removeMod(u.id)}
                      className='ml-0.5 rounded-full p-0.5 hover:bg-muted'
                    >
                      <Icons.close className='h-2.5 w-2.5' />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Candidate list */}
            {modSearch.length >= 2 && candidates.length > 0 && (
              <div className='max-h-40 space-y-0.5 overflow-y-auto rounded-lg border p-1'>
                {candidates.slice(0, 10).map((u) => (
                  <button
                    key={u.id}
                    type='button'
                    className='flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted'
                    onClick={() => addMod(u.id)}
                  >
                    <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold'>
                      {u.full_name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((w) => w[0]?.toUpperCase())
                        .join('')}
                    </div>
                    <div className='min-w-0 flex-1'>
                      <p className='truncate text-xs font-medium'>{u.full_name}</p>
                      {u.email && (
                        <p className='truncate text-[10px] text-muted-foreground'>{u.email}</p>
                      )}
                    </div>
                    <Icons.add className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
                  </button>
                ))}
              </div>
            )}

            {modSearch.length >= 2 && candidates.length === 0 && (
              <p className='py-4 text-center text-xs text-muted-foreground'>
                No users found
              </p>
            )}
          </div>
        )}

        {/* Step: Review */}
        {STEPS[step] === 'Review' && (
          <div className='space-y-3'>
            <div
              className='rounded-lg p-4'
              style={{ backgroundColor: `${themeColor}10` }}
            >
              <h4 className='font-semibold' style={{ color: themeColor }}>
                {name}
              </h4>
              {tagline && (
                <p className='mt-0.5 text-xs text-muted-foreground'>{tagline}</p>
              )}
              <div className='mt-2 flex flex-wrap gap-2 text-xs'>
                <span className='rounded bg-muted px-1.5 py-0.5'>
                  {joinPolicy.toLowerCase().replace('_', ' ')}
                </span>
                <span className='rounded bg-muted px-1.5 py-0.5'>
                  {scopeKind.toLowerCase()}
                </span>
              </div>
              {description && (
                <p className='mt-2 text-xs text-muted-foreground'>{description}</p>
              )}
            </div>
            {rules && (
              <div className='rounded-lg border p-3'>
                <p className='mb-1 text-xs font-medium'>Rules</p>
                <p className='whitespace-pre-wrap text-xs text-muted-foreground'>
                  {rules}
                </p>
              </div>
            )}
            {isDean && moderatorIds.length > 0 && (
              <div className='rounded-lg border p-3'>
                <p className='mb-1 text-xs font-medium'>
                  Moderators ({moderatorIds.length})
                </p>
                <div className='flex flex-wrap gap-1'>
                  {selectedMods.map((u) => (
                    <Badge key={u.id} variant='secondary' className='text-[10px]'>
                      {u.full_name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className='flex items-center justify-between pt-2'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            Back
          </Button>
          <div className='flex gap-2'>
            {step < STEPS.length - 1 ? (
              <Button
                size='sm'
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed}
                style={{ backgroundColor: themeColor }}
              >
                Next
              </Button>
            ) : (
              <Button
                size='sm'
                onClick={handleSubmit}
                disabled={mutation.isPending}
                style={{ backgroundColor: themeColor }}
              >
                {mutation.isPending ? (
                  <>
                    <Icons.spinner className='mr-1.5 h-3 w-3 animate-spin' />
                    {isDean ? 'Creating...' : 'Submitting...'}
                  </>
                ) : isDean ? (
                  'Create Club'
                ) : (
                  'Submit Application'
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
