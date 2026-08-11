'use client'

import { Button } from '@/features/ui/components/button'
import { Icons } from '@/components/icons'
import { ComposerAttachmentChips } from './composer-attachment-chips'
import { ComposerInput } from './composer-input'
import { ComposerStatusBadges } from './composer-status-badges'
import { ComposerToolbar } from './composer-toolbar'
import type { MessageComposerProps } from './types'
import { useMessageComposer } from './use-message-composer'
import { MessageReplyBar } from '@/components/discussions/message-reply-quote'

export function MessageComposer(props: MessageComposerProps) {
  const c = useMessageComposer(props)

  if (!c.perms.canSend) {
    return (
      <div className='border-t border-border/70 bg-card/80 px-6 py-3 text-center text-xs text-muted-foreground backdrop-blur'>
        You don’t have permission to send messages in this channel.
      </div>
    )
  }

  return (
    <div className='min-w-0 shrink-0 overflow-hidden border-t border-[#E5E7EB] bg-[#F8FAFC]'>
      {c.replyTo && !props.parentMessageId ? (
        <MessageReplyBar
          replyTo={c.replyTo}
          onClear={() => c.onClearReply?.()}
        />
      ) : null}
      <div className='px-2 py-2 sm:px-3 sm:py-3'>
      <ComposerStatusBadges
        effectiveAskAsQuestion={c.effectiveAskAsQuestion}
        effectivePostAnonymously={c.effectivePostAnonymously}
        slashActive={c.slashActive}
      />
      <ComposerAttachmentChips
        attachments={c.files.attachments}
        onRemove={c.files.removeAttachment}
      />
      <div
        className='flex min-w-0 items-end gap-1 rounded-lg border border-[#E5E7EB] bg-white px-1.5 py-1.5 shadow-sm focus-within:border-[#3B82F6]/40 focus-within:ring-2 focus-within:ring-[#3B82F6]/15 sm:gap-1.5 sm:px-2 sm:py-2'
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
        }}
        onDrop={(e) => {
          e.preventDefault()
          if (c.perms.canAttachFiles) c.files.handleFiles(e.dataTransfer.files)
        }}
      >
        <input
          ref={c.fileInputRef}
          type='file'
          className='hidden'
          multiple
          onChange={(e) => {
            c.files.handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <ComposerToolbar
          canAttachFiles={c.perms.canAttachFiles}
          onAttachClick={() => c.fileInputRef.current?.click()}
          emojiOpen={c.emojiOpen}
          setEmojiOpen={c.setEmojiOpen}
          onInsertEmoji={c.insertEmoji}
          isThreadReply={c.isThreadReply}
          isQaChannel={c.isQaChannel}
          effectiveAskAsQuestion={c.effectiveAskAsQuestion}
          effectivePostAnonymously={c.effectivePostAnonymously}
          slashActive={c.slashActive}
          value={c.value}
          setValue={c.setValue}
          setAskAsQuestion={c.setAskAsQuestion}
          setPostAnonymously={c.setPostAnonymously}
        />
        <ComposerInput
          textareaRef={c.textareaRef}
          value={c.value}
          setValue={c.setValue}
          placeholder={c.composerPlaceholder}
          mention={c.mentions.mention}
          setMention={c.mentions.setMention}
          mentionCandidates={c.mentions.mentionCandidates}
          refreshMentionState={c.mentions.refreshMentionState}
          insertMention={c.mentions.insertMention}
          onKeyDown={c.handleKeyDown}
          noteTypingActivity={c.noteTypingActivity}
          stopTyping={c.stopTyping}
        />
        <Button
          type='button'
          size='icon'
          className='h-9 w-9 shrink-0 rounded-full bg-[#3B82F6] text-white shadow-sm transition-transform hover:bg-[#2563EB] hover:scale-[1.03] active:scale-95'
          aria-label='Send message'
          onClick={c.handleSubmit}
          disabled={!c.canSend || c.sendPending}
        >
          {c.sendPending ? (
            <Icons.spinner className='h-4 w-4 animate-spin' />
          ) : (
            <Icons.send className='h-4 w-4' />
          )}
        </Button>
      </div>
      <p className='mt-1.5 hidden truncate px-1 text-[10px] text-muted-foreground sm:block'>
        Enter to send · Shift+Enter newline
        {!c.isThreadReply ? (
          <>
            {' · '}
            <code className='rounded bg-muted px-1 font-mono'>/qa</code>
          </>
        ) : null}
      </p>
      </div>
    </div>
  )
}
