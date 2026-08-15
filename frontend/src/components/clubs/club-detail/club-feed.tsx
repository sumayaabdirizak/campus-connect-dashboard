'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Icons } from '@/components/icons'
import { Skeleton } from '@/components/ui/skeleton'
import { useClubFeed, usePostClubMessage, useToggleClubReaction } from '@/lib/clubs/queries'
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

/** Spelled-out relative time for the post byline: "about 1 month ago". */
function timeAgoLong(iso: string) {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const mins = Math.floor((Date.now() - then) / 60000)
  if (mins < 1) return 'just now'
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'} ago`
  if (mins < 60) return plural(mins, 'minute')
  const hours = Math.floor(mins / 60)
  if (hours < 24) return plural(hours, 'hour')
  const days = Math.floor(hours / 24)
  if (days < 30) return plural(days, 'day')
  const months = Math.floor(days / 30)
  if (months < 12) return `about ${plural(months, 'month')}`
  return `about ${plural(Math.floor(months / 12), 'year')}`
}

/**
 * Splits trailing hashtags off the body so they can render as chips.
 * Only a trailing run is pulled — hashtags used mid-sentence stay in the text.
 */
function splitTrailingHashtags(content: string) {
  const match = content.match(/((?:\s*#[\w-]+)+)\s*$/)
  if (!match) return { body: content.trim(), tags: [] as string[] }
  return {
    body: content.slice(0, match.index).trim(),
    tags: match[1].trim().split(/\s+/),
  }
}

/** Renders body text with bare URLs turned into links. */
function renderBody(text: string) {
  return text.split(/(https?:\/\/\S+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target='_blank'
        rel='noopener noreferrer'
        className='font-medium text-emerald-600 underline underline-offset-2 hover:text-emerald-700 break-all'
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

const LIKE_EMOJI = '❤️'

function FeedMessage({
  message,
  themeColor,
  serverId,
}: {
  message: DiscussionMessage
  themeColor: string
  serverId?: number | null
}) {
  const viewerId = useAuthStore((s) => s.user?.id)
  const toggleReaction = useToggleClubReaction(serverId)
  const name = message.isAnonymous ? 'Anonymous' : (message.sender?.full_name ?? 'Unknown')
  const avatarUrl = message.isAnonymous ? null : message.sender?.avatarUrl
  // Only the author gets the overflow menu.
  const isAuthor =
    viewerId != null && Number(viewerId) === Number(message.senderId ?? message.sender?.id)

  const serverReactions = message.reactions ?? []
  const commentCount = message.threadPreview?.replyCount ?? 0
  // Attachments carry `fileType`, not `type`.
  const images = (message.attachments ?? []).filter((a) =>
    String(a.fileType).toUpperCase() === 'IMAGE'
  )
  const files = (message.attachments ?? []).filter((a) =>
    String(a.fileType).toUpperCase() !== 'IMAGE'
  )

  const { body, tags } = splitTrailingHashtags(message.content ?? '')

  const likes = serverReactions.filter((r) => r.emoji === LIKE_EMOJI)
  const liked =
    viewerId != null && likes.some((r) => Number(r.userId) === Number(viewerId))
  const likeCount = likes.length
  const firstLiker = likes.find((r) => r.user?.full_name)?.user?.full_name

  return (
    <div className='w-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md'>
      {/* Header */}
      <div className='mb-4 flex items-start justify-between gap-3'>
        <div className='flex min-w-0 flex-1 items-center gap-3'>
          <div
            className='flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold'
            style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt='' className='h-full w-full object-cover' />
            ) : (
              initials(name)
            )}
          </div>
          <div className='min-w-0 flex-1'>
            <p className='truncate text-sm font-bold text-gray-900'>{name}</p>
            <p
              className='mt-0.5 flex items-center gap-1 text-xs text-gray-500'
              title={new Date(message.createdAt).toLocaleString()}
            >
              <Icons.clock className='h-3.5 w-3.5' />
              {timeAgoLong(message.createdAt)}
            </p>
          </div>
        </div>
        {isAuthor ? (
          <button
            type='button'
            aria-label='Post options'
            className='shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700'
          >
            <Icons.ellipsis className='h-4 w-4' />
          </button>
        ) : null}
      </div>

      {/* Body */}
      {body ? (
        <p className='whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-900'>
          {renderBody(body)}
        </p>
      ) : null}

      {/* Image grid */}
      {images.length > 0 ? (
        <div
          className={`mt-3 grid gap-1 overflow-hidden rounded-xl ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}
        >
          {images.slice(0, 4).map((img) => (
            <a
              key={img.id}
              href={img.accessUrl ?? img.url ?? '#'}
              target='_blank'
              rel='noopener noreferrer'
              className='block overflow-hidden bg-gray-100'
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.accessUrl ?? img.url ?? ''}
                alt=''
                className={`w-full object-cover ${images.length === 1 ? 'max-h-96' : 'h-40'}`}
              />
            </a>
          ))}
        </div>
      ) : null}

      {/* Non-image attachments */}
      {files.length > 0 ? (
        <div className='mt-3 space-y-1.5'>
          {files.map((file) => (
            <a
              key={file.id}
              href={file.accessUrl ?? file.url ?? '#'}
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700 transition-colors hover:bg-gray-100'
            >
              <Icons.paperclip className='h-3.5 w-3.5 shrink-0 text-gray-400' />
              <span className='truncate'>{file.fileType}</span>
            </a>
          ))}
        </div>
      ) : null}

      {/* Hashtags */}
      {tags.length > 0 ? (
        <div className='mt-3 flex flex-wrap gap-1.5'>
          {tags.map((tag) => (
            <span
              key={tag}
              className='rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600'
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {/* Divider */}
      <div className='my-3 h-px bg-gray-200' />

      {/* Actions — like and comment only */}
      <div className='flex items-center gap-5'>
        <button
          type='button'
          onClick={() =>
            toggleReaction.mutate({ messageId: message.id, emoji: LIKE_EMOJI, mine: liked })
          }
          disabled={toggleReaction.isPending}
          aria-pressed={liked}
          aria-label={liked ? 'Remove like' : 'Like post'}
          className={`flex items-center gap-1.5 text-sm transition-colors disabled:opacity-50 ${liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
        >
          <Icons.heart className='h-5 w-5' />
          {likeCount > 0 ? <span className='text-xs'>{likeCount}</span> : null}
        </button>
        <button
          type='button'
          className='flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-blue-500'
        >
          <Icons.chat className='h-5 w-5' />
          {commentCount > 0 ? <span className='text-xs'>{commentCount}</span> : null}
        </button>
      </div>

      {/* Who liked it */}
      {firstLiker ? (
        <p className='mt-3 text-xs text-gray-400'>
          {serverReactions.length > 1
            ? `${firstLiker} and ${serverReactions.length - 1} other${serverReactions.length - 1 === 1 ? '' : 's'} liked this`
            : `${firstLiker} liked this`}
        </p>
      ) : null}
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
          // A club posts to its server, not a channel — without this the
          // upload route rejects with "groupId, channelId, or groupDmId is required".
          groupId: serverId as number,
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
          <FeedMessage key={m.id} message={m} themeColor={themeColor} serverId={serverId} />
        ))
      )}
    </div>
  )
}

export default ClubFeed
