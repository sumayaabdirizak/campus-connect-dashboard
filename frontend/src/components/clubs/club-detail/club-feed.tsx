'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Icons } from '@/components/icons'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  useClubFeed,
  usePostClubMessage,
  useToggleClubReaction,
  useClubComments,
  usePostClubComment,
  useEditClubMessage,
  useDeleteClubMessage,
} from '@/lib/clubs/queries'
import { useAuthStore } from '@/lib/auth-store'
import { uploadDiscussionFile } from '@/lib/discussions/services/discussion-upload'
import { useDiscussionServerRoom } from '@/lib/discussions/services/use-discussion-room'
import { timeAgoLong } from '@/lib/format-time'
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

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Extension → short label + accent colour for the pending-attachment chip. */
const FILE_KIND_BY_EXT: Record<string, { label: string; className: string }> = {
  ts: { label: 'TypeScript', className: 'bg-blue-50 text-blue-600' },
  tsx: { label: 'TypeScript', className: 'bg-blue-50 text-blue-600' },
  js: { label: 'JavaScript', className: 'bg-amber-50 text-amber-600' },
  jsx: { label: 'JavaScript', className: 'bg-amber-50 text-amber-600' },
  json: { label: 'JSON', className: 'bg-muted text-muted-foreground' },
  pdf: { label: 'PDF', className: 'bg-red-50 text-red-600' },
  doc: { label: 'Word', className: 'bg-sky-50 text-sky-600' },
  docx: { label: 'Word', className: 'bg-sky-50 text-sky-600' },
  xls: { label: 'Excel', className: 'bg-emerald-50 text-emerald-600' },
  xlsx: { label: 'Excel', className: 'bg-emerald-50 text-emerald-600' },
  zip: { label: 'Archive', className: 'bg-purple-50 text-purple-600' },
  csv: { label: 'CSV', className: 'bg-emerald-50 text-emerald-600' },
  txt: { label: 'Text', className: 'bg-muted text-muted-foreground' },
}

function fileKind(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  return FILE_KIND_BY_EXT[ext] ?? { label: ext ? ext.toUpperCase() : 'File', className: 'bg-muted text-muted-foreground' }
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

/** Comment list + reply composer for one post. Only mounted once opened. */
function CommentThread({
  messageId,
  serverId,
  themeColor,
}: {
  messageId: string
  serverId?: number | null
  themeColor: string
}) {
  const { data, isLoading } = useClubComments(serverId, messageId, true)
  const postComment = usePostClubComment(serverId)
  const user = useAuthStore((s) => s.user)
  const [draft, setDraft] = useState('')

  const comments = data?.results ?? []
  const trimmed = draft.trim()

  const submit = () => {
    if (!trimmed || postComment.isPending) return
    postComment.mutate(
      { messageId, content: trimmed },
      { onSuccess: () => setDraft('') }
    )
  }

  return (
    <div className='mt-3 space-y-3 border-t border-border pt-3'>
      {isLoading ? (
        <div className='space-y-2'>
          <Skeleton className='h-10 rounded-lg' />
          <Skeleton className='h-10 rounded-lg' />
        </div>
      ) : comments.length > 0 ? (
        <div className='space-y-2.5'>
          {comments.map((c) => {
            const name = c.isAnonymous ? 'Anonymous' : (c.sender?.full_name ?? 'Unknown')
            const avatarUrl = c.isAnonymous ? null : c.sender?.avatarUrl
            return (
              <div key={c.id} className='flex items-start gap-2'>
                <div
                  className='flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] font-semibold'
                  style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt='' className='h-full w-full object-cover' />
                  ) : (
                    initials(name)
                  )}
                </div>
                <div className='min-w-0 flex-1 rounded-xl bg-muted px-3 py-2'>
                  <div className='flex items-baseline gap-2'>
                    <p className='truncate text-xs font-bold text-foreground'>{name}</p>
                    <p className='shrink-0 text-[10px] text-muted-foreground'>
                      {timeAgoLong(c.createdAt)}
                    </p>
                  </div>
                  {c.content ? (
                    <p className='mt-0.5 whitespace-pre-wrap break-words text-xs text-muted-foreground'>
                      {c.content}
                    </p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className='text-xs text-muted-foreground'>No comments yet — be the first to reply.</p>
      )}

      {/* Reply composer */}
      <div className='flex items-center gap-2'>
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
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
          }}
          placeholder='Write a comment...'
          maxLength={20000}
          className='min-w-0 flex-1 rounded-full border border-border bg-muted px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gray-300'
        />
        <button
          type='button'
          onClick={submit}
          disabled={!trimmed || postComment.isPending}
          aria-label='Send comment'
          className='shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40'
        >
          <Icons.send className='h-4 w-4' />
        </button>
      </div>
    </div>
  )
}

function FeedMessage({
  message,
  themeColor,
  serverId,
  canModerate = false,
}: {
  message: DiscussionMessage
  themeColor: string
  serverId?: number | null
  /** Lets a non-author delete this post (owners/admins). Editing stays author-only. */
  canModerate?: boolean
}) {
  const viewerId = useAuthStore((s) => s.user?.id)
  const toggleReaction = useToggleClubReaction(serverId)
  const editMutation = useEditClubMessage(serverId)
  const deleteMutation = useDeleteClubMessage(serverId)
  const [showComments, setShowComments] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editDraft, setEditDraft] = useState(message.content ?? '')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const name = message.isAnonymous ? 'Anonymous' : (message.sender?.full_name ?? 'Unknown')
  const avatarUrl = message.isAnonymous ? null : message.sender?.avatarUrl
  const isAuthor =
    viewerId != null && Number(viewerId) === Number(message.senderId ?? message.sender?.id)
  // Author can edit or delete their own post; a moderator can only delete.
  const canDelete = isAuthor || canModerate
  const canShowMenu = isAuthor || canModerate

  const saveEdit = () => {
    const trimmed = editDraft.trim()
    if (!trimmed || trimmed === message.content || editMutation.isPending) {
      setIsEditing(false)
      return
    }
    editMutation.mutate(
      { messageId: message.id, content: trimmed },
      { onSuccess: () => setIsEditing(false) }
    )
  }

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
    <div className='w-full rounded-xl border border-border bg-card p-5 transition-shadow duration-200 hover:shadow-md'>
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
            <p className='truncate text-sm font-bold text-foreground'>{name}</p>
            <p
              className='mt-0.5 flex items-center gap-1 text-xs text-muted-foreground'
              title={new Date(message.createdAt).toLocaleString()}
            >
              <Icons.clock className='h-3.5 w-3.5' />
              {timeAgoLong(message.createdAt)}
              {message.editedAt ? <span>· edited</span> : null}
            </p>
          </div>
        </div>
        {canShowMenu ? (
          <Popover
            open={menuOpen}
            onOpenChange={(open) => {
              setMenuOpen(open)
              if (!open) setConfirmingDelete(false)
            }}
          >
            <PopoverTrigger asChild>
              <button
                type='button'
                aria-label='Post options'
                className='shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-muted-foreground'
              >
                <Icons.ellipsis className='h-4 w-4' />
              </button>
            </PopoverTrigger>
            <PopoverContent align='end' className='w-40 p-1'>
              {isAuthor ? (
                <button
                  type='button'
                  onClick={() => {
                    setEditDraft(message.content ?? '')
                    setIsEditing(true)
                    setMenuOpen(false)
                  }}
                  className='flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted'
                >
                  <Icons.edit className='h-3.5 w-3.5' />
                  Edit post
                </button>
              ) : null}
              {canDelete ? (
                confirmingDelete ? (
                  <button
                    type='button'
                    onClick={() => {
                      deleteMutation.mutate(message.id, { onSuccess: () => setMenuOpen(false) })
                    }}
                    disabled={deleteMutation.isPending}
                    className='flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50'
                  >
                    <Icons.trash className='h-3.5 w-3.5' />
                    {deleteMutation.isPending ? 'Deleting...' : 'Confirm delete'}
                  </button>
                ) : (
                  <button
                    type='button'
                    onClick={() => setConfirmingDelete(true)}
                    className='flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted'
                  >
                    <Icons.trash className='h-3.5 w-3.5' />
                    Delete post
                  </button>
                )
              ) : null}
            </PopoverContent>
          </Popover>
        ) : null}
      </div>

      {/* Body */}
      {isEditing ? (
        <div>
          <Textarea
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                saveEdit()
              }
              if (e.key === 'Escape') {
                setIsEditing(false)
                setEditDraft(message.content ?? '')
              }
            }}
            rows={3}
            maxLength={20000}
            autoFocus
            className='min-h-[60px] resize-none text-sm'
          />
          <div className='mt-2 flex items-center justify-end gap-2'>
            <button
              type='button'
              onClick={() => {
                setIsEditing(false)
                setEditDraft(message.content ?? '')
              }}
              className='rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted'
            >
              Cancel
            </button>
            <Button
              size='sm'
              onClick={saveEdit}
              disabled={editMutation.isPending || !editDraft.trim()}
              className='h-7 rounded-full bg-gray-900 px-4 text-[11px] font-semibold text-white hover:bg-gray-800'
            >
              {editMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      ) : body ? (
        <p className='whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground'>
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
              className='block overflow-hidden bg-muted'
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
              className='flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted'
            >
              <Icons.paperclip className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
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
              className='rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground'
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {/* Divider */}
      <div className='my-3 h-px bg-border' />

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
          className={`flex items-center gap-1.5 text-sm transition-colors disabled:opacity-50 ${liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}
        >
          <Icons.heart className='h-5 w-5' />
          {likeCount > 0 ? <span className='text-xs'>{likeCount}</span> : null}
        </button>
        <button
          type='button'
          onClick={() => setShowComments((v) => !v)}
          aria-expanded={showComments}
          className={`flex items-center gap-1.5 text-sm transition-colors ${showComments ? 'text-blue-500' : 'text-muted-foreground hover:text-blue-500'}`}
        >
          <Icons.chat className='h-5 w-5' />
          {commentCount > 0 ? <span className='text-xs'>{commentCount}</span> : null}
        </button>
      </div>

      {/* Who liked it */}
      {firstLiker ? (
        <p className='mt-3 text-xs text-muted-foreground'>
          {serverReactions.length > 1
            ? `${firstLiker} and ${serverReactions.length - 1} other${serverReactions.length - 1 === 1 ? '' : 's'} liked this`
            : `${firstLiker} liked this`}
        </p>
      ) : null}

      {showComments ? (
        <CommentThread messageId={message.id} serverId={serverId} themeColor={themeColor} />
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
  canModerate = false,
}: {
  serverId?: number | null
  themeColor: string
  canPost: boolean
  /** Owners/admins can delete any post, not just their own. */
  canModerate?: boolean
}) {
  const [draft, setDraft] = useState('')
  const [attachments, setAttachments] = useState<
    { id: string; name: string; size: number }[]
  >([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  useDiscussionServerRoom(serverId)
  const { data, isLoading, error } = useClubFeed(serverId)
  const postMutation = usePostClubMessage(serverId)
  const user = useAuthStore((s) => s.user)

  const messages = data?.results ?? []
  const trimmed = draft.trim()
  const hasDraft = trimmed.length > 0 || attachments.length > 0

  const clearDraft = () => {
    setDraft('')
    setAttachments([])
  }

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
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
      const uploaded: { id: string; name: string; size: number }[] = []
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
        // The upload response has no filename — keep it from the local File
        // the user picked, since that's what the chip needs to render.
        uploaded.push({ id: result.id, name: file.name, size: file.size })
      }
      setAttachments((prev) => [...prev, ...uploaded])
    } catch (err) {
      toast.error((err as Error).message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const submit = () => {
    if ((!trimmed && attachments.length === 0) || postMutation.isPending) return
    const attachmentIds = attachments.map((a) => a.id)
    postMutation.mutate(
      { content: trimmed, attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined },
      {
        onSuccess: () => {
          setDraft('')
          setAttachments([])
        },
      }
    )
  }

  return (
    <div className='space-y-3'>
      {canPost ? (
        <div className='rounded-lg border border-border bg-card p-2.5'>
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
                <p className='truncate text-xs font-bold leading-tight text-foreground'>
                  {user?.full_name ?? 'You'}
                </p>
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
            className='mt-2 min-h-[30px] resize-none border-0 bg-transparent p-0 text-xs shadow-none placeholder:text-muted-foreground focus-visible:ring-0'
          />

          {attachments.length > 0 ? (
            <div className='mt-2 flex flex-wrap gap-2'>
              {attachments.map((a) => {
                const kind = fileKind(a.name)
                return (
                  <div
                    key={a.id}
                    className='flex items-center gap-2 rounded-lg border border-border bg-muted py-1.5 pl-2 pr-1.5'
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${kind.className}`}>
                      <Icons.page className='h-4 w-4' />
                    </div>
                    <div className='min-w-0'>
                      <p className='max-w-[160px] truncate text-xs font-medium text-foreground'>
                        {a.name}
                      </p>
                      <p className='text-[10px] text-muted-foreground'>
                        {kind.label} · {formatFileSize(a.size)}
                      </p>
                    </div>
                    <button
                      type='button'
                      onClick={() => removeAttachment(a.id)}
                      aria-label={`Remove ${a.name}`}
                      className='shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-muted-foreground'
                    >
                      <Icons.close className='h-3.5 w-3.5' />
                    </button>
                  </div>
                )
              })}
            </div>
          ) : null}

          {/* Divider */}
          <div className='my-2 h-px bg-border' />

          {/* Toolbar */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-0.5'>
              <button
                type='button'
                onClick={() => pickFiles('image/*')}
                disabled={uploading}
                aria-label='Attach photo'
                className='rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40'
              >
                <Icons.media className='h-3.5 w-3.5' />
              </button>
              <button
                type='button'
                onClick={() => pickFiles('')}
                disabled={uploading}
                aria-label='Attach file'
                className='rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40'
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
          <FeedMessage
            key={m.id}
            message={m}
            themeColor={themeColor}
            serverId={serverId}
            canModerate={canModerate}
          />
        ))
      )}
    </div>
  )
}

export default ClubFeed
