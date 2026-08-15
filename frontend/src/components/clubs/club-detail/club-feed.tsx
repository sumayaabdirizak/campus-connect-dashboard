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
  const threadCount = 0 // Placeholder for thread reply count
  const hasAttachments = (message.attachments ?? []).length > 0
  const imageAttachments = (message.attachments ?? []).filter(a => a.type === 'IMAGE')

  return (
    <div className='group rounded-lg border border-border bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/20'>
      <div className='p-4'>
        {/* Header with avatar, name, time, actions */}
        <div className='flex items-start justify-between gap-3'>
          <div className='flex gap-3 flex-1 min-w-0'>
            <div
              className='flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold shadow-sm'
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
              <div className='flex items-center gap-2 flex-wrap'>
                <span className='truncate text-sm font-semibold leading-tight'>{name}</span>
                <span className='shrink-0 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground'>
                  Member
                </span>
              </div>
              <p className='text-xs text-muted-foreground mt-1 cursor-help hover:text-foreground transition-colors' title={new Date(message.createdAt).toLocaleString()}>
                {timeAgo(message.createdAt)}
              </p>
            </div>
          </div>

          {/* More menu */}
          <button className='opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground'>
            <Icons.ellipsis className='h-4 w-4' />
          </button>
        </div>

        {/* Message content */}
        <div className='mt-3 ml-13'>
          {message.content ? (
            <p className='whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground'>
              {message.content}
            </p>
          ) : hasAttachments ? null : (
            <p className='text-sm italic text-muted-foreground'>[no content]</p>
          )}

          {/* Image attachments grid */}
          {imageAttachments.length > 0 && (
            <div className={`mt-3 grid gap-2 ${imageAttachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {imageAttachments.slice(0, 4).map((attachment) => (
                <div
                  key={attachment.id}
                  className='relative aspect-square rounded-md overflow-hidden bg-muted border border-border hover:border-primary/50 transition-colors group/img cursor-pointer'
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={attachment.url || ''}
                    alt='attachment'
                    className='w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200'
                  />
                  <div className='absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors' />
                </div>
              ))}
              {imageAttachments.length > 4 && (
                <div className='relative aspect-square rounded-md overflow-hidden bg-muted border border-border flex items-center justify-center'>
                  <span className='text-sm font-medium text-muted-foreground'>+{imageAttachments.length - 4} more</span>
                </div>
              )}
            </div>
          )}

          {/* Other attachments */}
          {hasAttachments && (message.attachments ?? []).filter(a => a.type !== 'IMAGE').length > 0 && (
            <div className='mt-3 space-y-1.5'>
              {(message.attachments ?? []).filter(a => a.type !== 'IMAGE').map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.url || '#'}
                  className='flex items-center gap-2 p-2 rounded-md bg-muted hover:bg-muted/80 transition-colors group/file text-xs'
                >
                  <Icons.paperclip className='h-3.5 w-3.5 text-muted-foreground' />
                  <span className='truncate text-foreground group-hover/file:text-primary'>{attachment.fileName || 'Download'}</span>
                  <Icons.externalLink className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Reactions bar */}
        {reactionCount > 0 && (
          <div className='mt-3 flex flex-wrap gap-1.5 ml-13'>
            {(message.reactions ?? []).map((reaction, i) => (
              <button
                key={i}
                className='flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-muted/60 hover:bg-muted border border-border/50 text-xs font-medium transition-all hover:scale-105 cursor-pointer'
              >
                <span>{reaction}</span>
                <span className='text-muted-foreground text-xs'>1</span>
              </button>
            ))}
          </div>
        )}

        {/* Engagement metrics */}
        <div className='mt-3 ml-13 flex items-center gap-4 text-xs text-muted-foreground border-t border-border/50 pt-3'>
          <button className='hover:text-foreground transition-colors hover:underline'>
            {reactionCount > 0 ? `${reactionCount} reaction${reactionCount !== 1 ? 's' : ''}` : 'Add reaction'}
          </button>
          {threadCount > 0 && (
            <button className='hover:text-foreground transition-colors hover:underline'>
              {threadCount} repl{threadCount !== 1 ? 'ies' : 'y'}
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className='mt-3 ml-13 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
          <button className='flex items-center justify-center gap-1.5 px-3 py-2 rounded-md hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors'>
            <Icons.heart className='h-4 w-4' />
            React
          </button>
          <button className='flex items-center justify-center gap-1.5 px-3 py-2 rounded-md hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors'>
            <Icons.chat className='h-4 w-4' />
            Reply
          </button>
          <button className='flex items-center justify-center gap-1.5 px-3 py-2 rounded-md hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors'>
            <Icons.share className='h-4 w-4' />
            Share
          </button>
        </div>
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
        <div className='rounded-xl border bg-card p-4'>
          <div className='flex gap-3'>
            <div
              className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold'
              style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
            >
              {initials(user?.full_name)}
            </div>
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
              className='min-h-[60px] resize-none'
            />
          </div>
          <div className='mt-3 flex items-center justify-between'>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className='flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50'
            >
              <Icons.paperclip className='h-4 w-4' />
              Photo / file
            </button>
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
              disabled={(!trimmed && attachmentIds.length === 0) || postMutation.isPending || uploading}
              style={{ backgroundColor: themeColor }}
            >
              {postMutation.isPending ? 'Posting...' : 'Post'}
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
