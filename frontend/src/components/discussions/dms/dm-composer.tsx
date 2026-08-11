'use client'

import { useEffect, useRef, useState } from 'react'
import { Paperclip, Smile } from 'lucide-react'
import { Button } from '@/features/ui/components/button'
import { Textarea } from '@/features/ui/components/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/features/ui/components/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/features/ui/components/tooltip'
import { Icons } from '@/components/icons'
import { cn } from '@/lib/utils'
import { useSendGroupDmMessage } from '@/lib/discussions/queries/queries'
import type { DiscussionMessage } from '@/lib/discussions/queries/types'
import { COMPOSER_EMOJIS } from '@/components/discussions/composer/message-composer/types'
import { ComposerAttachmentChips } from '@/components/discussions/composer/message-composer/composer-attachment-chips'
import { useComposerTyping } from '@/components/discussions/composer/message-composer/use-composer-typing'
import { useDmComposerAttachments } from './use-dm-composer-attachments'
import { MessageReplyBar } from '@/components/discussions/message-reply-quote'

const MAX_LINES = 10

export function DmComposer({
  groupDmId,
  canPost,
  placeholder,
  myUserId,
  myDisplayName,
  replyTo,
  onClearReply,
  onOptimisticInsert,
  onOptimisticReplace,
  onOptimisticRemove,
}: {
  groupDmId: string
  canPost: boolean
  placeholder?: string
  myUserId?: number | null
  myDisplayName?: string | null
  replyTo?: DiscussionMessage | null
  onClearReply?: () => void
  onOptimisticInsert?: (temp: DiscussionMessage) => void
  onOptimisticReplace?: (tempId: string, real: DiscussionMessage) => void
  onOptimisticRemove?: (tempId: string) => void
}) {
  const [value, setValue] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const sendMutation = useSendGroupDmMessage(groupDmId)
  const { noteTypingActivity, stopTyping } = useComposerTyping({
    groupDmId,
  })
  // Attaching files uses the same `canPost` gate as sending text — a member
  // who can't post shouldn't be able to upload into the conversation either.
  const { attachments, handleFiles, removeAttachment, clearAttachments, hasPendingUploads } =
    useDmComposerAttachments({ groupDmId, canAttachFiles: canPost })
  const readyAttachmentIds = attachments
    .filter((a) => a.result != null)
    .map((a) => a.result!.id)

  useEffect(() => {
    if (replyTo) textareaRef.current?.focus()
  }, [replyTo?.id])

  const insertEmoji = (emoji: string) => {
    setValue((v) => v + emoji)
    setEmojiOpen(false)
    textareaRef.current?.focus()
  }

  const handleSubmit = () => {
    if (!canPost || sendMutation.isPending || hasPendingUploads) return
    const trimmed = value.trim()
    const attachmentIds = readyAttachmentIds
    if (!trimmed && attachmentIds.length === 0) return
    stopTyping()

    // Capture before optimistic clear — state update must not wipe the payload.
    const replyToMessageId = replyTo?.id ?? null
    const replySnapshot = replyTo
      ? {
          id: replyTo.id,
          content: replyTo.content,
          deletedAt: replyTo.deletedAt,
          sender: replyTo.sender ?? null,
        }
      : null

    // Skip optimistic insert when attachments are involved — the real
    // attachment shape (url, fileType, etc.) only comes back from the
    // server, so we wait for the response rather than fake a placeholder.
    const useOptimism =
      !!onOptimisticInsert &&
      !!onOptimisticReplace &&
      !!onOptimisticRemove &&
      attachmentIds.length === 0
    const tempId = useOptimism ? `temp-${Date.now()}` : null
    if (useOptimism && tempId != null) {
      onOptimisticInsert!({
        id: tempId,
        channelId: null,
        groupDmId,
        senderId: myUserId ?? null,
        content: trimmed,
        messageType: 'TEXT',
        createdAt: new Date().toISOString(),
        editedAt: null,
        deletedAt: null,
        parentMessageId: null,
        replyToMessageId,
        replyTo: replySnapshot,
        sender: myUserId
          ? { id: myUserId, full_name: myDisplayName ?? '' }
          : null,
        attachments: [],
        reactions: [],
      })
      setValue('')
      onClearReply?.()
    }

    sendMutation.mutate(
      {
        content: trimmed || null,
        messageType: attachmentIds.length > 0 && !trimmed ? 'MEDIA' : 'TEXT',
        ...(replyToMessageId ? { replyToMessageId } : {}),
        ...(attachmentIds.length > 0 ? { attachmentIds } : {}),
      },
      {
        onSuccess: (result) => {
          clearAttachments()
          if (useOptimism && tempId != null) {
            const real =
              (result as { message?: DiscussionMessage })?.message ?? null
            if (real) onOptimisticReplace!(tempId, real)
            else onOptimisticRemove!(tempId)
          } else {
            setValue('')
            onClearReply?.()
          }
        },
        onError: () => {
          if (useOptimism && tempId != null) {
            onOptimisticRemove!(tempId)
            setValue(trimmed)
          }
        },
      }
    )
  }

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  if (!canPost) {
    return (
      <div className='border-t border-border/70 bg-card/80 px-6 py-3 text-center text-xs text-muted-foreground backdrop-blur'>
        You can’t send messages in this conversation.
      </div>
    )
  }

  return (
    <div className='min-w-0 shrink-0 overflow-hidden border-t border-[#E5E7EB] bg-[#F8FAFC]'>
      {replyTo ? (
        <MessageReplyBar replyTo={replyTo} onClear={() => onClearReply?.()} />
      ) : null}
      <div className='px-2 py-2 sm:px-3 sm:py-3'>
        <ComposerAttachmentChips attachments={attachments} onRemove={removeAttachment} />
        <div className='flex min-w-0 items-end gap-1 rounded-lg border border-[#E5E7EB] bg-white px-1.5 py-1.5 shadow-sm focus-within:border-[#3B82F6]/40 focus-within:ring-2 focus-within:ring-[#3B82F6]/15 sm:gap-1.5 sm:px-2 sm:py-2'>
          <div className='flex shrink-0 items-center gap-0.5'>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 rounded-full'
                  aria-label='Attach file'
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent side='top'>Attach file</TooltipContent>
            </Tooltip>
            <input
              ref={fileInputRef}
              type='file'
              multiple
              className='hidden'
              onChange={(e) => {
                handleFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8 rounded-full'
                      aria-label='Insert emoji'
                    >
                      <Smile className='h-4 w-4' />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side='top'>Emoji</TooltipContent>
              </Tooltip>
              <PopoverContent className='w-64 p-2' align='start'>
                <div className='grid grid-cols-8 gap-0.5'>
                  {COMPOSER_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type='button'
                      onClick={() => insertEmoji(emoji)}
                      className='flex h-8 w-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-muted'
                      aria-label={`Insert ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className='relative min-w-0 flex-1'>
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                noteTypingActivity()
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder ?? 'Type a message'}
              rows={1}
              className={cn(
                'max-h-[160px] min-h-[36px] resize-none border-0 bg-transparent px-1 py-2 shadow-none focus-visible:ring-0',
                'text-sm leading-5'
              )}
              style={{ height: 'auto' }}
              onInput={(e) => {
                const el = e.currentTarget
                el.style.height = 'auto'
                const line = 20
                const max = line * MAX_LINES
                el.style.height = `${Math.min(el.scrollHeight, max)}px`
              }}
            />
          </div>

          <Button
            type='button'
            size='icon'
            className='h-8 w-8 shrink-0 rounded-full bg-[#3B82F6] text-white hover:bg-[#2563EB]'
            disabled={
              (!value.trim() && readyAttachmentIds.length === 0) ||
              sendMutation.isPending ||
              hasPendingUploads
            }
            onClick={handleSubmit}
            aria-label='Send'
          >
            {sendMutation.isPending ? (
              <Icons.spinner className='h-4 w-4 animate-spin' />
            ) : (
              <Icons.send className='h-4 w-4' />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
