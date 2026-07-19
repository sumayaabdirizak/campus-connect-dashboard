'use client';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { DiscussionChannelKind } from '../../../../api/types';
import { KIND_OPTIONS } from './constants';

interface ChannelKindPickerProps {
  kind: DiscussionChannelKind;
  setKind: (k: DiscussionChannelKind) => void;
  isArchived: boolean;
}

export function ChannelKindPicker({
  kind,
  setKind,
  isArchived
}: ChannelKindPickerProps) {
  return (
    <div className='space-y-2'>
      <div className='flex items-center gap-1.5'>
        <Label className='text-xs'>Channel type</Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type='button'
              className='text-muted-foreground transition-colors hover:text-foreground'
              aria-label='About channel types'
            >
              <Icons.info className='h-3 w-3' />
            </button>
          </TooltipTrigger>
          <TooltipContent side='top' className='max-w-xs text-xs'>
            Type controls posting rules and how the channel feels. You can change
            it later, but Forum may surface old plain messages as ungrouped
            threads.
          </TooltipContent>
        </Tooltip>
      </div>
      <RadioGroup
        value={kind}
        onValueChange={(v) => setKind(v as DiscussionChannelKind)}
        className='gap-2'
        disabled={isArchived}
      >
        {KIND_OPTIONS.map(({ value, label, description, Icon }) => {
          const selected = kind === value;
          return (
            <Label
              key={value}
              htmlFor={`channel-kind-${value}`}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-md border p-2.5 text-left transition-colors',
                'hover:bg-muted/50',
                selected ? 'border-primary/50 bg-primary/5' : 'border-border',
                isArchived && 'cursor-not-allowed opacity-60'
              )}
            >
              <RadioGroupItem
                id={`channel-kind-${value}`}
                value={value}
                className='mt-0.5'
              />
              <Icon className='mt-0.5 h-4 w-4 shrink-0 text-muted-foreground' />
              <div className='flex-1 space-y-0.5'>
                <div className='text-sm font-medium leading-none'>{label}</div>
                <p className='text-[11px] leading-snug text-muted-foreground'>
                  {description}
                </p>
              </div>
            </Label>
          );
        })}
      </RadioGroup>
    </div>
  );
}
