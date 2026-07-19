'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCreateGroupDm, useGroupDmCandidates } from '../../../api/queries'
import type { GroupDmCandidate } from '../../../api/types'
import { MAX_OTHER_MEMBERS, MIN_OTHER_MEMBERS } from './constants'

export function useDmCreateForm(open: boolean, onOpenChange: (next: boolean) => void) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selected, setSelected] = useState<GroupDmCandidate[]>([])
  const [name, setName] = useState('')
  const searchRef = useRef<HTMLInputElement | null>(null)

  const { data, isLoading } = useGroupDmCandidates(debouncedSearch)
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

  const handleCreate = () => {
    if (selected.length < MIN_OTHER_MEMBERS || create.isPending) return
    create.mutate(
      { name: name.trim() || null, memberUserIds: selected.map((c) => c.id) },
      {
        onSuccess: (res) => {
          onOpenChange(false)
          const id = (res as { groupDm?: { id?: number } })?.groupDm?.id
          if (id) router.push(`/dashboard/chat/dm/${id}`)
        },
      }
    )
  }

  return {
    search,
    setSearch,
    name,
    setName,
    selected,
    toggle,
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
