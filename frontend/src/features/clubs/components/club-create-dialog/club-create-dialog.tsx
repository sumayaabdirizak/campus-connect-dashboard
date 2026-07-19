'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/icons'
import { ClubCreateNav } from './club-create-nav'
import { StepIdentity } from './step-identity'
import { StepModerators } from './step-moderators'
import { StepReview } from './step-review'
import { StepScopeRules } from './step-scope-rules'
import { useClubCreateForm } from './use-club-create-form'

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
  const form = useClubCreateForm({
    isDean,
    defaultFacultyId,
    onCreated: () => setOpen(false),
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) form.reset()
      }}
    >
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
          <DialogTitle>{isDean ? 'Create a Club' : 'Apply for a Club'}</DialogTitle>
          <DialogDescription>
            {isDean
              ? 'Create a club directly as a dean. It will be immediately active.'
              : 'Submit a club application. A dean will review and approve it.'}
          </DialogDescription>
        </DialogHeader>

        <div className='flex gap-1'>
          {form.steps.map((s, i) => (
            <div
              key={s}
              className='h-1 flex-1 rounded-full transition-colors'
              style={{
                backgroundColor: i <= form.step ? form.themeColor : 'var(--border)',
              }}
            />
          ))}
        </div>
        <p className='text-xs text-muted-foreground'>
          Step {form.step + 1} of {form.steps.length}: {form.steps[form.step]}
        </p>

        {form.step === 0 ? (
          <StepIdentity
            name={form.name}
            slug={form.slug}
            tagline={form.tagline}
            themeColor={form.themeColor}
            onNameChange={form.handleNameChange}
            onSlugChange={form.setSlug}
            onTaglineChange={form.setTagline}
            onThemeColorChange={form.setThemeColor}
          />
        ) : null}

        {form.step === 1 ? (
          <StepScopeRules
            isDean={isDean}
            description={form.description}
            rules={form.rules}
            joinPolicy={form.joinPolicy}
            scopeKind={form.scopeKind}
            onDescriptionChange={form.setDescription}
            onRulesChange={form.setRules}
            onJoinPolicyChange={form.setJoinPolicy}
            onScopeKindChange={form.setScopeKind}
          />
        ) : null}

        {form.steps[form.step] === 'Moderators' ? (
          <StepModerators
            modSearch={form.modSearch}
            onModSearchChange={form.setModSearch}
            moderatorIds={form.moderatorIds}
            candidates={form.candidates as any}
            selectedMods={form.selectedMods}
            onAdd={form.addMod}
            onRemove={form.removeMod}
          />
        ) : null}

        {form.steps[form.step] === 'Review' ? (
          <StepReview
            isDean={isDean}
            name={form.name}
            tagline={form.tagline}
            description={form.description}
            rules={form.rules}
            joinPolicy={form.joinPolicy}
            scopeKind={form.scopeKind}
            themeColor={form.themeColor}
            moderatorIds={form.moderatorIds}
            selectedMods={form.selectedMods}
          />
        ) : null}

        <ClubCreateNav
          step={form.step}
          stepCount={form.steps.length}
          themeColor={form.themeColor}
          canProceed={form.canProceed}
          isPending={form.mutation.isPending}
          isDean={isDean}
          onBack={() => form.setStep((s) => Math.max(0, s - 1))}
          onNext={() => form.setStep((s) => s + 1)}
          onSubmit={form.handleSubmit}
        />
      </DialogContent>
    </Dialog>
  )
}
