'use client';

import { MessageRow } from '@/components/discussions/channel/message-row';
import { DaySeparator, isSameLocalDay } from '@/components/discussions/channel/day-separator';
import type { DiscussionMessage } from '@/lib/discussions/queries/types';
import type { DiscussionPermissions } from '@/lib/discussions/services/use-discussion-permissions';

export function ThreadRepliesList({
  replies,
  channelId,
  myUserId,
  perms,
  pinnedSet,
}: {
  replies: DiscussionMessage[];
  channelId: string;
  myUserId: number | null;
  perms: DiscussionPermissions;
  pinnedSet?: ReadonlySet<string>;
}) {
  const items: React.ReactElement[] = [];
  let prev: DiscussionMessage | null = null;
  for (const m of replies) {
    const showDay = !prev || !isSameLocalDay(prev.createdAt, m.createdAt);
    if (showDay) {
      items.push(<DaySeparator key={`day-${m.id}`} iso={m.createdAt} />);
    }
    items.push(
      <MessageRow
        key={`reply-${m.id}`}
        message={m}
        channelId={channelId}
        myUserId={myUserId}
        perms={perms}
        isPinned={pinnedSet?.has(m.id) ?? false}
        showHeader
        inThread
      />
    );
    prev = m;
  }
  return <>{items}</>;
}
