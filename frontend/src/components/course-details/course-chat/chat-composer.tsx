'use client';

import type { ChangeEvent, FormEvent, KeyboardEvent, RefObject } from 'react';
import { CornerUpLeft, Loader2, Paperclip, Send, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/features/ui/components/avatar';
import { Button } from '@/features/ui/components/button';
import { Textarea } from '@/features/ui/components/textarea';
import { avatarGradient } from '@/lib/discussions/services/avatar-color';
import type { ChatMessage } from '@/lib/course-details/types';
import { initialsOf } from './chat-utils';

interface ChatComposerProps {
  replyTo: ChatMessage | null;
  onClearReply: () => void;
  message: string;
  onMessageChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onBlur: () => void;
  onSubmit: (event?: FormEvent) => void;
  mentionOpen: boolean;
  mentionCandidates: Array<{ id: number; full_name: string; slug: string }>;
  onInsertMention: (slug: string) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  composerRef: RefObject<HTMLTextAreaElement | null>;
  onPickFiles: (event: ChangeEvent<HTMLInputElement>) => void;
  sendPending: boolean;
  uploadPending: boolean;
  typing: Array<{ full_name: string }>;
}

export function ChatComposer({
  replyTo,
  onClearReply,
  message,
  onMessageChange,
  onKeyDown,
  onBlur,
  onSubmit,
  mentionOpen,
  mentionCandidates,
  onInsertMention,
  fileInputRef,
  composerRef,
  onPickFiles,
  sendPending,
  uploadPending,
  typing
}: ChatComposerProps) {
  return (
    <>
      {typing.length > 0 ? (
        <div className='border-t bg-muted/20 px-4 py-2 text-xs text-muted-foreground'>
          {typing.length === 1
            ? `${typing[0].full_name} is typing...`
            : typing.length === 2
              ? `${typing[0].full_name} and ${typing[1].full_name} are typing...`
              : `${typing.length} people are typing...`}
        </div>
      ) : null}
      {replyTo ? (
        <div className='flex items-start justify-between gap-3 border-t bg-muted/30 px-4 py-3'>
          <div className='flex min-w-0 items-start gap-2'>
            <CornerUpLeft className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
            <div className='min-w-0'>
              <p className='text-xs font-medium'>Replying to {replyTo.sender.full_name}</p>
              <p className='truncate text-xs text-muted-foreground'>{replyTo.content}</p>
            </div>
          </div>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='size-7 shrink-0'
            onClick={onClearReply}
          >
            <X className='size-4' />
          </Button>
        </div>
      ) : null}
      <form onSubmit={onSubmit} className='relative border-t p-4'>
        {mentionOpen ? (
          <div className='absolute bottom-full left-4 right-4 mb-2 max-h-56 overflow-y-auto overscroll-contain rounded-lg border bg-background shadow-lg'>
            {mentionCandidates.map((candidate) => (
              <button
                key={candidate.id}
                type='button'
                onClick={() => onInsertMention(candidate.slug)}
                className='flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60'
              >
                <Avatar className='size-7'>
                  <AvatarFallback
                    className='text-[10px] font-semibold text-white'
                    style={{ background: avatarGradient(candidate.full_name) }}
                  >
                    {initialsOf(candidate.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className='min-w-0 flex-1 truncate'>{candidate.full_name}</span>
              </button>
            ))}
          </div>
        ) : null}
        <div className='flex items-end gap-2'>
          <input
            ref={fileInputRef}
            type='file'
            multiple
            onChange={onPickFiles}
            className='hidden'
          />
          <Button
            type='button'
            variant='outline'
            size='icon'
            onClick={() => fileInputRef.current?.click()}
            disabled={sendPending || uploadPending}
            title='Attach files'
          >
            {uploadPending ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <Paperclip className='size-4' />
            )}
          </Button>
          <Textarea
            ref={composerRef}
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
            placeholder={replyTo ? 'Write your reply...' : 'Message this course...'}
            className='max-h-36 min-h-11 flex-1 resize-none py-2.5'
          />
          <Button type='submit' size='icon' disabled={!message.trim() || sendPending}>
            {sendPending ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <Send className='size-4' />
            )}
          </Button>
        </div>
      </form>
    </>
  );
}
