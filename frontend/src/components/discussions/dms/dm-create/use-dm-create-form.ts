'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isDeanRole } from '@shared/roles'
import { useAuthStore } from '@/lib/auth-store'
import { useCreateGroupDm, useGroupDmCandidates } from '@/lib/discussions/queries/queries'
import type { GroupDmCandidate } from '@/lib/discussions/queries/types'
import { MAX_OTHER_MEMBERS, MIN_OTHER_MEMBERS } from './constants'

export function useDmCreateForm(
  open: boolean,
  onOpenChange: (next: boolean) => void,
  onOpened?: (href: string) => void
) {
  const router = useRouter()
  const role = useAuthStore((s) => s.user?.role)
  const deanGroupMode = false
  const facultyDeanMode = isDeanRole(role)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selected, setSelected] = useState<GroupDmCandidate[]>([])
  const [name, setName] = useState('')
  const searchRef = useRef<HTMLInputElement | null>(null)

  const { data, isLoading } = useGroupDmCandidates(debouncedSearch, 'group', open)
  const create = useCreateGroupDm()

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 200)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (!open) {
      setSearch('')
      setDebouncedSearch('')
      setSelected([])
      setName('')
    }
  }, [open])

  const candidates = data?.results ?? []
  const selectedIds = useMemo(() => new Set(selected.map((c) => c.id)), [selected])

  const toggle = (c: GroupDmCandidate) => {
    if (selectedIds.has(c.id)) {
      setSelected((prev) => prev.filter((x) => x.id !== c.id))
      return
    }
    if (selected.length >= MAX_OTHER_MEMBERS) return
    setSelected((prev) => [...prev, c])
  }

  const selectAllMatching = (people: GroupDmCandidate[]) => {
    const room = MAX_OTHER_MEMBERS - selected.length
    if (room <= 0) return
    const add = people.filter((c) => !selectedIds.has(c.id)).slice(0, room)
    if (add.length === 0) return
    setSelected((prev) => [...prev, ...add])
  }

  const handleCreate = () => {
    if (selected.length < MIN_OTHER_MEMBERS || create.isPending) return
    create.mutate(
      { name: name.trim() || null, memberUserIds: selected.map((c) => c.id) },
      {
        onSuccess: (res) => {
          onOpenChange(false)
          const id = (res as { groupDm?: { id?: string } })?.groupDm?.id
          if (!id) return
          const href = `/dashboard/messages?dm=${id}`
          if (onOpened) onOpened(href)
          else router.push(href)
        },
      }
    )
  }

  return {
    deanGroupMode,
    facultyDeanMode,
    search,
    setSearch,
    name,
    setName,
    selected,
    toggle,
    selectAllMatching,
    candidates,
    selectedIds,
    isLoading,
    debouncedSearch,
    searchRef,
    create,
    handleCreate,
    tooFew: selected.length < MIN_OTHER_MEMBERS,
    atMax: selected.length >= MAX_OTHER_MEMBERS,
  }
}
