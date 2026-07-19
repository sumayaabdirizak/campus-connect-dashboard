'use client'

import { Button } from '@/components/ui/button'
import { Icons } from '@/components/icons'
import { ComposerAttachmentChips } from './composer-attachment-chips'
import { ComposerInput } from './composer-input'
import { ComposerStatusBadges } from './composer-status-badges'
import { ComposerToolbar } from './composer-toolbar'
import type { MessageComposerProps } from './types'
import { useMessageComposer } from './use-message-composer'

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
    <div className='border-t border-border/70 bg-[#E6F0FA]/30 px-3 py-3 sm:px-4'>
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
        className='flex items-end gap-1.5 rounded-[var(--comm-composer-radius)] border border-border/70 bg-background px-2 py-2 shadow-sm focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-ring/25'
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
          className='h-9 w-9 shrink-0 rounded-full bg-[#0066CC] text-white shadow-sm transition-transform hover:bg-[#0D3B66] hover:scale-[1.03] active:scale-95'
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
      <p className='mt-1.5 px-1 text-[10px] text-muted-foreground'>
        Enter to send · Shift+Enter for newline · Drop files to attach
        {!c.isThreadReply ? (
          <>
            {' · '}
            <code className='rounded bg-muted px-1 font-mono'>/qa</code> question
          </>
        ) : null}
      </p>
    </div>
  )
}
