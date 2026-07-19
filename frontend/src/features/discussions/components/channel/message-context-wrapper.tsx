'use client';

import { Fragment, type ReactNode } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { ReactionStrip } from './message-reaction-strip';
import type { MessageActionsCommonProps } from './message-menu-types';
import { useMessageActions } from './use-message-actions';

/** Right-click anywhere on the wrapped child to open the WhatsApp/Slack-style menu. */
export function MessageContextWrapper({
  children,
  ...props
}: MessageActionsCommonProps & { children: ReactNode }) {
  const { actions, onReact } = useMessageActions(props);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent
        className='w-60 overflow-visible'
        collisionPadding={8}
      >
        <div className='-mt-1 mb-1 px-1 pb-1'>
          <ReactionStrip onReact={onReact} />
        </div>
        <ContextMenuSeparator />
        {actions.map((action, idx) => {
          const showSep =
            action.destructive && idx > 0 && !actions[idx - 1]?.destructive;
          return (
            <Fragment key={action.key}>
              {showSep && <ContextMenuSeparator />}
              <ContextMenuItem
                onSelect={action.onSelect}
                className={cn(
                  'gap-2',
                  action.destructive && 'text-destructive focus:text-destructive'
                )}
              >
                {action.icon}
                {action.label}
              </ContextMenuItem>
            </Fragment>
          );
        })}
      </ContextMenuContent>
    </ContextMenu>
  );
}
