'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCreateChannel } from '../../../api/queries'
import type {
  DiscussionChannel,
  DiscussionChannelCategory,
} from '../../../api/types'
import { NAME_MAX, TOPIC_MAX, UNCATEGORIZED } from './constants'
import { previewSlug } from './preview-slug'

export function useChannelCreateForm({
  open,
  serverId,
  categories,
  existingChannels,
  defaultCategoryId,
  onOpenChange,
}: {
  open: boolean
  serverId: number
  categories: DiscussionChannelCategory[]
  existingChannels: DiscussionChannel[]
  defaultCategoryId: number | null
  onOpenChange: (next: boolean) => void
}) {
  const router = useRouter()
  const createMut = useCreateChannel(serverId)

  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [categoryValue, setCategoryValue] = useState<string>(UNCATEGORIZED)

  useEffect(() => {
    if (!open) return
    setName('')
    setTopic('')
    setCategoryValue(
      defaultCategoryId == null ? UNCATEGORIZED : String(defaultCategoryId)
    )
  }, [open, defaultCategoryId])

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.position - b.position || a.id - b.id),
    [categories]
  )

  const trimmedName = name.trim()
  const trimmedTopic = topic.trim()
  const slug = previewSlug(trimmedName)

  const duplicateName = useMemo(() => {
    if (trimmedName.length === 0) return false
    const lower = trimmedName.toLowerCase()
    return existingChannels.some((c) => c.name.trim().toLowerCase() === lower)
  }, [existingChannels, trimmedName])

  const nameValid = trimmedName.length > 0 && trimmedName.length <= NAME_MAX
  const canSubmit = nameValid && !duplicateName && !createMut.isPending

  const handleSubmit = () => {
    if (!canSubmit) return
    const body: { name: string; topic?: string | null; categoryId?: number } = {
      name: trimmedName,
    }
    if (trimmedTopic.length > 0) body.topic = trimmedTopic
    if (categoryValue !== UNCATEGORIZED) {
      const n = Number(categoryValue)
      if (Number.isFinite(n) && n > 0) body.categoryId = n
    }
    createMut.mutate(body, {
      onSuccess: (data) => {
        onOpenChange(false)
        const newId = Number((data as { channel?: { id?: number } })?.channel?.id)
        if (Number.isFinite(newId) && newId > 0) {
          router.push(`/dashboard/chat/${serverId}/${newId}`)
        }
      },
    })
  }

  return {
    name,
    setName,
    topic,
    setTopic,
    categoryValue,
    setCategoryValue,
    sortedCategories,
    trimmedName,
    slug,
    duplicateName,
    canSubmit,
    createMut,
    handleSubmit,
  }
}
