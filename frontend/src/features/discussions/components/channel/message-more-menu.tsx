'use client';

import { Fragment, type ReactNode } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ReactionStrip } from './message-reaction-strip';
import type { MessageActionsCommonProps } from './message-menu-types';
import { useMessageActions } from './use-message-actions';

/** Trigger is a "..." button (provided by parent) that opens the same menu on click. */
export function MessageMoreMenu({
  trigger,
  ...props
}: MessageActionsCommonProps & { trigger: ReactNode }) {
  const { actions, onReact } = useMessageActions(props);

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (typeof document === 'undefined') return;
        const trig = document.querySelector('[data-state="open"][data-slot="dropdown-menu-trigger"]');
        const toolbar = trig?.closest<HTMLElement>('[data-message-toolbar]');
        if (toolbar) toolbar.dataset.menuOpen = open ? 'true' : 'false';
      }}
    >
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        side='bottom'
        sideOffset={6}
        collisionPadding={8}
        avoidCollisions
        className='w-60 overflow-visible'
      >
        <div className='-mt-1 mb-1 px-1 pb-1'>
          <ReactionStrip onReact={onReact} />
        </div>
        <DropdownMenuSeparator />
        {actions.map((action, idx) => {
          const showSep =
            action.destructive && idx > 0 && !actions[idx - 1]?.destructive;
          return (
            <Fragment key={action.key}>
              {showSep && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onSelect={action.onSelect}
                className={cn(
                  'gap-2',
                  action.destructive && 'text-destructive focus:text-destructive'
                )}
              >
                {action.icon}
                {action.label}
              </DropdownMenuItem>
            </Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
