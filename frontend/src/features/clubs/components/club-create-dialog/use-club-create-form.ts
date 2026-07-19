'use client'

import { useState } from 'react'
import { useCreateClub, useCreateClubAsDean } from '../../api/queries'
import { useGroupDmCandidates } from '@/features/discussions/api/queries'
import type { ClubJoinPolicy, ClubScopeKind, CreateClubPayload } from '../../api/types'
import { DEAN_STEPS, STUDENT_STEPS, deriveSlug } from './constants'

export function useClubCreateForm({
  isDean,
  defaultFacultyId,
  onCreated,
}: {
  isDean: boolean
  defaultFacultyId?: number
  onCreated: () => void
}) {
  const [step, setStep] = useState(0)
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
  const steps = isDean ? DEAN_STEPS : STUDENT_STEPS

  const { data: candidatesData } = useGroupDmCandidates(modSearch)
  const candidates = (candidatesData?.results ?? []).filter(
    (u) => !moderatorIds.includes(u.id)
  )
  const selectedMods =
    candidatesData?.results?.filter((u) => moderatorIds.includes(u.id)) ?? []

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

  const handleNameChange = (val: string) => {
    setName(val)
    if (!slug || slug === deriveSlug(name)) setSlug(deriveSlug(val))
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
        onCreated()
        reset()
      },
    })
  }

  return {
    step,
    setStep,
    steps,
    name,
    slug,
    setSlug,
    tagline,
    setTagline,
    description,
    setDescription,
    rules,
    setRules,
    joinPolicy,
    setJoinPolicy,
    scopeKind,
    setScopeKind,
    themeColor,
    setThemeColor,
    moderatorIds,
    modSearch,
    setModSearch,
    candidates,
    selectedMods,
    addMod: (userId: number) => setModeratorIds((prev) => [...prev, userId]),
    removeMod: (userId: number) =>
      setModeratorIds((prev) => prev.filter((id) => id !== userId)),
    handleNameChange,
    handleSubmit,
    reset,
    mutation,
    canProceed: step === 0 ? name.trim().length >= 3 : true,
  }
}
