'use client'

import type { RefObject } from 'react'
import { useMemo, useState } from 'react'
import { Button } from '@/features/ui/components/button'
import { Input } from '@/features/ui/components/input'
import { Icons } from '@/components/icons'
import type { GroupDmCandidate } from '@/lib/discussions/queries/types'
import { MAX_OTHER_MEMBERS } from './constants'
import {
  AO_GROUP_ROLE_FILTERS,
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
  deanGroupMode = false,
  facultyDeanMode = false,
  showNameField = true,
  name,
  setName,
  search,
  setSearch,
  selected,
  toggle,
  selectAllMatching,
  candidates,
  selectedIds,
  isLoading,
  debouncedSearch,
  searchRef,
  atMax,
}: {
  deanGroupMode?: boolean
  facultyDeanMode?: boolean
  /** Hide the "Group name" field — e.g. when adding members to an existing conversation. */
  showNameField?: boolean
  name: string
  setName: (v: string) => void
  search: string
  setSearch: (v: string) => void
  selected: GroupDmCandidate[]
  toggle: (c: GroupDmCandidate) => void
  selectAllMatching?: (people: GroupDmCandidate[]) => void
  candidates: GroupDmCandidate[]
  selectedIds: Set<number>
  isLoading: boolean
  debouncedSearch: string
  searchRef: RefObject<HTMLInputElement | null>
  atMax: boolean
}) {
  const [roles, setRoles] = useState<RoleFilterKey[]>(
    deanGroupMode
      ? AO_GROUP_ROLE_FILTERS
      : facultyDeanMode
        ? DEAN_GROUP_ROLE_FILTERS
        : DEFAULT_ROLE_FILTERS
  )
  const filterVariant = deanGroupMode ? 'ao' : facultyDeanMode ? 'dean' : 'student'
  const scoped = useMemo(
    () => filterByRoles(candidates, roles),
    [candidates, roles]
  )
  const isSearching = debouncedSearch.trim().length > 0
  const unselectedScoped = scoped.filter((c) => !selectedIds.has(c.id))
  const canSelectAll =
    deanGroupMode && Boolean(selectAllMatching) && !atMax && unselectedScoped.length > 0

  const selectAllLabel = useMemo(() => {
    const onlyDean = roles.length === 1 && roles[0] === 'DEAN'
    const onlyStaff = roles.length === 1 && roles[0] === 'OFFICE_STAFF'
    if (onlyDean) return 'Select all deans'
    if (onlyStaff) return 'Select all office staff'
    return 'Select all shown'
  }, [roles])

  return (
    <div className='space-y-3'>
      {showNameField ? (
        <div className='space-y-1.5'>
          <label className='text-[11px] font-medium text-muted-foreground'>
            Group name
          </label>
          <Input
            placeholder={
              deanGroupMode
                ? 'Optional — e.g. Deans & office staff'
                : 'Optional — e.g. Math study group'
            }
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
        {canSelectAll ? (
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-7 shrink-0 text-[11px]'
            onClick={() => selectAllMatching?.(unselectedScoped)}
          >
            {selectAllLabel}
          </Button>
        ) : null}
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

      {isSearching || deanGroupMode ? (
        <DmCandidatePeopleList
          people={scoped}
          selectedIds={selectedIds}
          isLoading={isLoading}
          emptyLabel={
            deanGroupMode
              ? roles.length === 1 && roles[0] === 'OFFICE_STAFF'
                ? 'No office staff found.'
                : roles.length === 1 && roles[0] === 'DEAN'
                  ? 'No deans found.'
                  : 'No deans or office staff found.'
              : 'No people match that search / filter.'
          }
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
