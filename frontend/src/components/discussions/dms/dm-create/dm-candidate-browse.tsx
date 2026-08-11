'use client'

import { Icons } from '@/components/icons'
import type { GroupDmCandidate } from '@/lib/discussions/queries/types'
import { DmCandidatePeopleList } from './dm-candidate-people-list'
import { DmHierarchyNavList } from './dm-hierarchy-nav-list'
import { useDmCandidateBrowse } from './use-dm-candidate-browse'

export function DmCandidateBrowse({
  candidates,
  selectedIds,
  isLoading,
  atMax,
  toggle,
}: {
  candidates: GroupDmCandidate[]
  selectedIds: Set<number>
  isLoading: boolean
  atMax: boolean
  toggle: (c: GroupDmCandidate) => void
}) {
  const {
    step,
    departments,
    batches,
    sections,
    people,
    goBack,
    pickDepartment,
    pickBatch,
    pickSection,
    crumb,
  } = useDmCandidateBrowse(candidates)

  return (
    <div className='space-y-1.5'>
      <div className='flex items-center gap-1'>
        {step !== 'department' ? (
          <button
            type='button'
            onClick={goBack}
            className='inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground'
            aria-label='Back'
          >
            <Icons.chevronLeft className='size-4' />
          </button>
        ) : null}
        <span className='min-w-0 flex-1 truncate text-[11px] font-medium text-muted-foreground'>
          {crumb}
        </span>
      </div>

      {step === 'department' ? (
        <DmHierarchyNavList
          nodes={departments}
          emptyLabel={isLoading ? 'Loading departments…' : 'No people found in your faculty yet.'}
          onPick={pickDepartment}
        />
      ) : null}

      {step === 'batch' ? (
        <DmHierarchyNavList
          nodes={batches}
          emptyLabel='No batches in this department.'
          onPick={pickBatch}
        />
      ) : null}

      {step === 'section' ? (
        <DmHierarchyNavList
          nodes={sections}
          emptyLabel='No sections in this batch.'
          onPick={pickSection}
        />
      ) : null}

      {step === 'people' ? (
        <DmCandidatePeopleList
          people={people}
          selectedIds={selectedIds}
          isLoading={false}
          emptyLabel='No people in this section.'
          atMax={atMax}
          toggle={toggle}
        />
      ) : null}
    </div>
  )
}
