'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Icons } from '@/components/icons'
import { Skeleton } from '@/components/ui/skeleton'
import { useClubFeed, usePostClubMessage } from '@/lib/clubs/queries'
import { useAuthStore } from '@/lib/auth-store'
import { uploadDiscussionFile } from '@/lib/discussions/services/discussion-upload'
import { toast } from 'sonner'
import type { DiscussionMessage } from '@/lib/discussions/queries/types'

function initials(name?: string | null) {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

/** "just now" / "5m" / "3h" / "2d", falling back to a date past a week. */
function timeAgo(iso: string) {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const mins = Math.floor((Date.now() - then) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(iso).toLocaleDateString()
}

function FeedMessage({ message, themeColor }: { message: DiscussionMessage; themeColor: string }) {
  const name = message.isAnonymous ? 'Anonymous' : (message.sender?.full_name ?? 'Unknown')
  const avatarUrl = message.isAnonymous ? null : message.sender?.avatarUrl
  const reactionCount = (message.reactions ?? []).length
  const commentCount = 0 // Placeholder for comment count
  const hasAttachments = (message.attachments ?? []).length > 0
  const imageAttachments = (message.attachments ?? []).filter(a => a.type === 'IMAGE')
  const [reactions, setReactions] = useState<Record<string, number>>({ '❤️': reactionCount })
  const [showReactionPicker, setShowReactionPicker] = useState(false)

  const handleAddReaction = (emoji: string) => {
    setReactions((prev) => ({
      ...prev,
      [emoji]: (prev[emoji] || 0) + 1,
    }))
    setShowReactionPicker(false)
  }

  return (
    <div className='w-full bg-gray-50 border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-shadow duration-200'>
      {/* Header */}
      <div className='flex items-start justify-between mb-4'>
        <div className='flex items-center gap-4 flex-1 min-w-0'>
          <a href='#' className='flex-shrink-0'>
            <div
              className='flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold border-2 border-gray-200'
              style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt='' className='h-full w-full object-cover' />
              ) : (
                initials(name)
              )}
            </div>
          </a>
          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-2'>
              <a href='#' className='font-bold text-gray-900 hover:underline truncate text-base'>
                {name}
              </a>
            </div>
            <a href='#' className='text-gray-500 text-sm hover:underline'>
              @{name.toLowerCase().replace(/\s+/g, '')}
            </a>
          </div>
        </div>
        <a href='#' className='flex-shrink-0 text-blue-400 hover:text-blue-600 transition-colors'>
          <Icons.ellipsis className='w-6 h-6' />
        </a>
      </div>

      {/* Content */}
      <div className='mb-4'>
        {message.content ? (
          <p className='text-gray-900 text-base leading-relaxed whitespace-pre-wrap break-words'>
            {message.content}
          </p>
        ) : null}
      </div>

      {/* Image attachments */}
      {imageAttachments.length > 0 && (
        <div className='mb-4'>
          <div className='rounded-2xl overflow-hidden border-2 border-gray-200'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageAttachments[0]?.url || ''} alt='' className='w-full h-80 object-cover' />
          </div>
        </div>
      )}

      {/* Timestamp */}
      <div className='text-gray-500 text-sm mb-4 cursor-help hover:text-gray-700' title={new Date(message.createdAt).toLocaleString()}>
        {timeAgo(message.createdAt)} · {new Date(message.createdAt).toLocaleDateString()}
      </div>

      {/* Engagement stats */}
      {(reactionCount > 0 || commentCount > 0) && (
        <div className='flex items-center gap-4 text-gray-500 text-xs py-2 border-t border-b border-gray-200'>
          {Object.entries(reactions).map(([emoji, count]) =>
            count > 0 ? (
              <button
                key={emoji}
                className='hover:text-gray-700 transition-colors cursor-pointer hover:underline'
              >
                {emoji} <span className='text-gray-500'>{count}</span>
              </button>
            ) : null
          )}
          {commentCount > 0 && (
            <button className='hover:text-gray-700 transition-colors cursor-pointer hover:underline'>
              {commentCount} comment{commentCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className='flex items-center justify-around pt-4 text-gray-500 border-gray-200'>
        {/* Comments */}
        <button className='flex items-center justify-center gap-2 py-3 px-4 hover:bg-blue-50 hover:text-blue-500 rounded-full transition-colors group flex-1'>
          <Icons.chat className='w-5 h-5' />
          <span className='text-sm font-medium group-hover:block hidden'>Comment</span>
        </button>

        {/* Reactions */}
        <div className='relative'>
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className='flex items-center justify-center gap-2 py-3 px-4 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors group flex-1'
          >
            <Icons.heart className='w-5 h-5' />
            <span className='text-sm font-medium group-hover:block hidden'>React</span>
          </button>

          {/* Reaction picker */}
          {showReactionPicker && (
            <div className='absolute bottom-full left-0 mb-3 flex gap-2 bg-white border border-gray-200 rounded-full p-3 shadow-lg z-10'>
              {['❤️', '😂', '😢', '😮', '🔥', '👍'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleAddReaction(emoji)}
                  className='text-2xl hover:scale-125 transition-transform cursor-pointer'
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Share */}
        <button className='flex items-center justify-center gap-2 py-3 px-4 hover:bg-green-50 hover:text-green-500 rounded-full transition-colors group flex-1'>
          <Icons.share className='w-5 h-5' />
          <span className='text-sm font-medium group-hover:block hidden'>Share</span>
        </button>
      </div>
    </div>
  )
}

/**
 * In-club composer + post list for members. Text-only for now — attachments go
 * through the channel upload flow, which needs the club's defaultChannelId.
 */
export function ClubFeed({
  serverId,
  themeColor,
  canPost,
}: {
  serverId?: number | null
  themeColor: string
  canPost: boolean
}) {
  const [draft, setDraft] = useState('')
  const [attachmentIds, setAttachmentIds] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data, isLoading, error } = useClubFeed(serverId)
  const postMutation = usePostClubMessage(serverId)
  const user = useAuthStore((s) => s.user)

  const messages = data?.results ?? []
  const trimmed = draft.trim()
  const hasDraft = trimmed.length > 0 || attachmentIds.length > 0

  const clearDraft = () => {
    setDraft('')
    setAttachmentIds([])
  }

  /** Opens the picker filtered to `accept` ('' = anything). */
  const pickFiles = (accept: string) => {
    if (!fileInputRef.current) return
    fileInputRef.current.accept = accept
    fileInputRef.current.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length || !serverId) return

    setUploading(true)
    try {
      const newIds: string[] = []
      for (const file of files) {
        const { promise } = uploadDiscussionFile({
          file,
          keyVersion: 1,
          requireE2eeMetadata: false,
        })
        const result = await promise
        newIds.push(result.id)
      }
      setAttachmentIds((prev) => [...prev, ...newIds])
      toast.success(`Uploaded ${newIds.length} file(s)`)
    } catch (err) {
      toast.error((err as Error).message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const submit = () => {
    if ((!trimmed && attachmentIds.length === 0) || postMutation.isPending) return
    postMutation.mutate(
      { content: trimmed, attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined },
      {
        onSuccess: () => {
          setDraft('')
          setAttachmentIds([])
        },
      }
    )
  }

  return (
    <div className='space-y-3'>
      {canPost ? (
        <div className='rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm'>
          {/* Author row */}
          <div className='flex items-start justify-between gap-2'>
            <div className='flex min-w-0 items-center gap-2'>
              <div
                className='flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] font-semibold'
                style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
              >
                {user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt='' className='h-full w-full object-cover' />
                ) : (
                  initials(user?.full_name)
                )}
              </div>
              <div className='min-w-0'>
                <p className='truncate text-xs font-bold leading-tight text-gray-900'>
                  {user?.full_name ?? 'You'}
                </p>
                {user?.email ? (
                  <p className='truncate text-[10px] leading-tight text-gray-500'>{user.email}</p>
                ) : null}
              </div>
            </div>
            <button
              type='button'
              onClick={clearDraft}
              disabled={!hasDraft}
              aria-label='Clear post'
              className='shrink-0 rounded-full p-0.5 text-red-500 transition-colors hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent'
            >
              <Icons.close className='h-3.5 w-3.5' />
            </button>
          </div>

          {/* Draft */}
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter posts; Shift+Enter inserts a newline.
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder='Write something to the group...'
            rows={2}
            maxLength={20000}
            className='mt-2 min-h-[30px] resize-none border-0 bg-transparent p-0 text-xs shadow-none placeholder:text-gray-400 focus-visible:ring-0'
          />

          {attachmentIds.length > 0 ? (
            <p className='mt-1 text-[10px] text-gray-500'>
              {attachmentIds.length} file{attachmentIds.length !== 1 ? 's' : ''} attached
            </p>
          ) : null}

          {/* Divider */}
          <div className='my-2 h-px bg-gray-200' />

          {/* Toolbar */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-0.5'>
              <button
                type='button'
                onClick={() => pickFiles('image/*')}
                disabled={uploading}
                aria-label='Attach photo'
                className='rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40'
              >
                <Icons.media className='h-3.5 w-3.5' />
              </button>
              <button
                type='button'
                onClick={() => pickFiles('')}
                disabled={uploading}
                aria-label='Attach file'
                className='rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40'
              >
                <Icons.paperclip className='h-3.5 w-3.5' />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type='file'
              multiple
              className='hidden'
              onChange={handleFileSelect}
              disabled={uploading}
            />
            <Button
              size='sm'
              onClick={submit}
              disabled={!hasDraft || postMutation.isPending || uploading}
              className='h-7 rounded-full bg-gray-900 px-4 text-[11px] font-semibold text-white hover:bg-gray-800'
            >
              {postMutation.isPending ? 'Posting...' : uploading ? 'Uploading...' : 'Post'}
            </Button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <>
          <Skeleton className='h-20 rounded-xl' />
          <Skeleton className='h-20 rounded-xl' />
        </>
      ) : error ? (
        // Don't render a failed load as "no posts" — the usual cause is that the
        // viewer has no active membership on the club's server.
        <div className='rounded-xl border border-dashed bg-card px-4 py-8 text-center'>
          <Icons.alertCircle className='mx-auto mb-2 h-6 w-6 text-muted-foreground/50' />
          <p className='text-sm text-muted-foreground'>Couldn&apos;t load posts.</p>
          <p className='mt-1 text-xs text-muted-foreground'>
            {(error as Error).message}
          </p>
        </div>
      ) : messages.length === 0 ? (
        <div className='rounded-xl border border-dashed bg-card px-4 py-10 text-center'>
          <Icons.chat className='mx-auto mb-2 h-6 w-6 text-muted-foreground/50' />
          <p className='text-sm text-muted-foreground'>
            No posts yet. Start the conversation.
          </p>
        </div>
      ) : (
        // Endpoint returns oldest-first within a page; show newest at the top.
        [...messages].reverse().map((m) => (
          <FeedMessage key={m.id} message={m} themeColor={themeColor} />
        ))
      )}
    </div>
  )
}

export default ClubFeed
