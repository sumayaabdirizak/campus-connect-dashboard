'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { isDeanRole, isOfficeMessagesOnlyRole } from '@shared/roles'
import { useAuthStore } from '@/lib/auth-store'
import { useAddGroupDmMembers, useGroupDmCandidates } from '@/lib/discussions/queries/queries'
import type { GroupDmCandidate } from '@/lib/discussions/queries/types'
import { MAX_OTHER_MEMBERS } from '@/components/discussions/dms/dm-create/constants'

export function useAddMembersForm(
  groupDmId: string,
  existingMemberIds: number[],
  open: boolean,
  onOpenChange: (next: boolean) => void
) {
  const role = useAuthStore((s) => s.user?.role)
  const deanGroupMode = isOfficeMessagesOnlyRole(role)
  const facultyDeanMode = isDeanRole(role)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selected, setSelected] = useState<GroupDmCandidate[]>([])
  const searchRef = useRef<HTMLInputElement | null>(null)

  const { data, isLoading } = useGroupDmCandidates(debouncedSearch, 'group', open)
  const addMembers = useAddGroupDmMembers(groupDmId)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 200)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (!open) {
      setSearch('')
      setDebouncedSearch('')
      setSelected([])
    }
  }, [open])

  const existingIds = useMemo(() => new Set(existingMemberIds), [existingMemberIds])
  const candidates = useMemo(
    () => (data?.results ?? []).filter((c) => !existingIds.has(c.id)),
    [data, existingIds]
  )
  // Room left under the 50-total member cap the backend enforces.
  const room = Math.max(0, MAX_OTHER_MEMBERS + 1 - existingMemberIds.length)
  const selectedIds = useMemo(() => new Set(selected.map((c) => c.id)), [selected])

  const toggle = (c: GroupDmCandidate) => {
    if (selectedIds.has(c.id)) {
      setSelected((prev) => prev.filter((x) => x.id !== c.id))
      return
    }
    if (selected.length >= room) return
    setSelected((prev) => [...prev, c])
  }

  const handleAdd = () => {
    if (selected.length === 0 || addMembers.isPending) return
    addMembers.mutate(
      selected.map((c) => c.id),
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return {
    deanGroupMode,
    facultyDeanMode,
    search,
    setSearch,
    // DmCandidatePicker requires a name/setName pair even with the field hidden.
    name: '',
    setName: () => {},
    selected,
    toggle,
    candidates,
    selectedIds,
    isLoading,
    debouncedSearch,
    searchRef,
    addMembers,
    handleAdd,
    tooFew: selected.length === 0,
    atMax: selected.length >= room,
    room
  }
}
