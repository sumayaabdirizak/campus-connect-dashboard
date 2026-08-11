'use client';

import { Button } from '@/features/ui/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/features/ui/components/tooltip';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { stripQaSlashCommand } from '@/lib/discussions/services/discussion-qa';

interface ComposerQaActionsProps {
  isThreadReply: boolean;
  isQaChannel: boolean;
  effectiveAskAsQuestion: boolean;
  effectivePostAnonymously: boolean;
  slashActive: boolean;
  value: string;
  setValue: (v: string) => void;
  setAskAsQuestion: React.Dispatch<React.SetStateAction<boolean>>;
  setPostAnonymously: React.Dispatch<React.SetStateAction<boolean>>;
}

export function ComposerQaActions({
  isThreadReply,
  isQaChannel,
  effectiveAskAsQuestion,
  effectivePostAnonymously,
  slashActive,
  value,
  setValue,
  setAskAsQuestion,
  setPostAnonymously
}: ComposerQaActionsProps) {
  if (isThreadReply) return null;
  return (
    <>
      <span aria-hidden className='h-5 w-px shrink-0 bg-border' />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className={cn(
              'h-8 w-8 shrink-0',
              effectiveAskAsQuestion &&
                'bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-300'
            )}
            aria-label={
              effectiveAskAsQuestion ? 'Post as normal message' : 'Post as question'
            }
            aria-pressed={effectiveAskAsQuestion}
            onClick={() => {
              if (slashActive) {
                setValue(stripQaSlashCommand(value));
                setAskAsQuestion(false);
              } else {
                setAskAsQuestion((v) => !v);
              }
            }}
          >
            <Icons.help className='h-4 w-4' />
          </Button>
        </TooltipTrigger>
        <TooltipContent side='top'>
          {effectiveAskAsQuestion
            ? 'Posting as question — click to undo'
            : 'Post as question (or type /qa)'}
        </TooltipContent>
      </Tooltip>
      {isQaChannel && effectiveAskAsQuestion ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className={cn(
                'h-8 w-8 shrink-0',
                effectivePostAnonymously &&
                  'bg-violet-500/15 text-violet-700 hover:bg-violet-500/25 dark:text-violet-300'
              )}
              aria-label={
                effectivePostAnonymously ? 'Reveal your name' : 'Post anonymously'
              }
              aria-pressed={effectivePostAnonymously}
              onClick={() => setPostAnonymously((v) => !v)}
            >
              <Icons.user className='h-4 w-4' />
            </Button>
          </TooltipTrigger>
          <TooltipContent side='top'>
            {effectivePostAnonymously
              ? 'Anonymous — instructors can still see who you are'
              : 'Post anonymously'}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </>
  );
}
