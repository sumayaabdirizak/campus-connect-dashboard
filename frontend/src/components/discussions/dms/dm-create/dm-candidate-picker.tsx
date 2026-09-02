'use client'

import type { RefObject } from 'react'
import { useMemo, useState } from 'react'
import { Input } from '@/features/ui/components/input'
import { Icons } from '@/components/icons'
import type { GroupDmCandidate } from '@/lib/discussions/queries/types'
import { MAX_OTHER_MEMBERS } from './constants'
import {
  DEAN_GROUP_ROLE_FILTERS,
  DEFAULT_ROLE_FILTERS,
  filterByRoles,
  type RoleFilterKey,
} from './candidate-hierarchy'
import { DmCandidateBrowse } from './dm-candidate-browse'
import { DmCandidatePeopleList } from './dm-candidate-people-list'
import { DmCandidateSelectedChips } from './dm-candidate-selected-chips'
import { DmRoleFilter } from './dm-role-filter'

export function DmCandidatePicker({
  facultyDeanMode = false,
  showNameField = true,
  name,
  setName,
  search,
  setSearch,
  selected,
  toggle,
  candidates,
  selectedIds,
  isLoading,
  debouncedSearch,
  searchRef,
  atMax,
}: {
  facultyDeanMode?: boolean
  /** Hide the "Group name" field — e.g. when adding members to an existing conversation. */
  showNameField?: boolean
  name: string
  setName: (v: string) => void
  search: string
  setSearch: (v: string) => void
  selected: GroupDmCandidate[]
  toggle: (c: GroupDmCandidate) => void
  candidates: GroupDmCandidate[]
  selectedIds: Set<number>
  isLoading: boolean
  debouncedSearch: string
  searchRef: RefObject<HTMLInputElement | null>
  atMax: boolean
}) {
  const [roles, setRoles] = useState<RoleFilterKey[]>(
    facultyDeanMode ? DEAN_GROUP_ROLE_FILTERS : DEFAULT_ROLE_FILTERS
  )
  const filterVariant = facultyDeanMode ? 'dean' : 'student'
  const scoped = useMemo(
    () => filterByRoles(candidates, roles),
    [candidates, roles]
  )
  const isSearching = debouncedSearch.trim().length > 0

  return (
    <div className='space-y-3'>
      {showNameField ? (
        <div className='space-y-1.5'>
          <label className='text-[11px] font-medium text-muted-foreground'>
            Group name
          </label>
          <Input
            placeholder='Optional — e.g. Math study group'
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            className='h-10'
          />
        </div>
      ) : null}

      <div className='flex flex-wrap items-end justify-between gap-2'>
        <div className='min-w-0 flex-1'>
          <DmRoleFilter
            selected={roles}
            onChange={setRoles}
            variant={filterVariant}
          />
        </div>
      </div>

      <DmCandidateSelectedChips selected={selected} toggle={toggle} />

      <div className='space-y-1.5'>
        <label className='text-[11px] font-medium text-muted-foreground'>
          Find people
        </label>
        <div className='relative'>
          <Icons.search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            ref={searchRef}
            placeholder='Search name or email…'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='h-10 pl-9'
          />
        </div>
      </div>

      {isSearching ? (
        <DmCandidatePeopleList
          people={scoped}
          selectedIds={selectedIds}
          isLoading={isLoading}
          emptyLabel='No people match that search / filter.'
          atMax={atMax}
          toggle={toggle}
        />
      ) : (
        <DmCandidateBrowse
          key={roles.join(',')}
          candidates={scoped}
          selectedIds={selectedIds}
          isLoading={isLoading}
          atMax={atMax}
          toggle={toggle}
        />
      )}

      {atMax ? (
        <p className='text-[11px] text-muted-foreground'>
          You’ve hit the limit ({MAX_OTHER_MEMBERS} others ·{' '}
          {MAX_OTHER_MEMBERS + 1} total). Remove someone to add another.
        </p>
      ) : null}
    </div>
  )
}
