'use client'

import { Button } from '@/components/ui/button'
import { Icons } from '@/components/icons'

export function ClubCreateNav({
  step,
  stepCount,
  themeColor,
  canProceed,
  isPending,
  isDean,
  onBack,
  onNext,
  onSubmit,
}: {
  step: number
  stepCount: number
  themeColor: string
  canProceed: boolean
  isPending: boolean
  isDean: boolean
  onBack: () => void
  onNext: () => void
  onSubmit: () => void
}) {
  return (
    <div className='flex items-center justify-between pt-2'>
      <Button variant='ghost' size='sm' onClick={onBack} disabled={step === 0}>
        Back
      </Button>
      <div className='flex gap-2'>
        {step < stepCount - 1 ? (
          <Button
            size='sm'
            onClick={onNext}
            disabled={!canProceed}
            style={{ backgroundColor: themeColor }}
          >
            Next
          </Button>
        ) : (
          <Button
            size='sm'
            onClick={onSubmit}
            disabled={isPending}
            style={{ backgroundColor: themeColor }}
          >
            {isPending ? (
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
  )
}
