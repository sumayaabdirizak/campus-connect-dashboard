'use client'

import { Smile } from 'lucide-react'
import { Button } from '@/features/ui/components/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/features/ui/components/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/features/ui/components/tooltip'
import { Icons } from '@/components/icons'
import { COMPOSER_EMOJIS } from './types'

interface ComposerMediaActionsProps {
  canAttachFiles: boolean
  onAttachClick: () => void
  emojiOpen: boolean
  setEmojiOpen: (open: boolean) => void
  onInsertEmoji: (emoji: string) => void
}

export function ComposerMediaActions({
  canAttachFiles,
  onAttachClick,
  emojiOpen,
  setEmojiOpen,
  onInsertEmoji,
}: ComposerMediaActionsProps) {
  return (
    <div className='flex shrink-0 items-center gap-0.5'>
      {canAttachFiles ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='h-8 w-8 rounded-full'
              aria-label='Attach files'
              onClick={onAttachClick}
            >
              <Icons.paperclip className='h-4 w-4' />
            </Button>
          </TooltipTrigger>
          <TooltipContent side='top'>Attach image or document</TooltipContent>
        </Tooltip>
      ) : null}
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
                onClick={() => onInsertEmoji(emoji)}
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
  )
}
