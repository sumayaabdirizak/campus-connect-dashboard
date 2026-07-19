'use client';

import { useMemo, useState } from 'react';
import { X, Users, Paperclip, Pin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { confirmAction } from '@/lib/notifications';
import {
  useChannel,
  useChannelMembers,
  useRemoveServerMember,
  useServer,
  useServerPresence,
} from '../../api/queries';
import { useChannelMessages } from '../../hooks/use-channel-messages';
import { useDiscussionPermissions } from '../../hooks/use-discussion-permissions';
import type { PresenceState } from '../../api/types';
import { DetailsAboutMembers } from './details-about-members';
import { fileNameFromUrl } from './details-helpers';
import type { AggregatedAttachment } from './attachment-row';

type Tab = 'members' | 'files' | 'pinned';

const TAB_CONFIG: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: 'members', label: 'Members', Icon: Users },
  { id: 'files',   label: 'Files',   Icon: Paperclip },
  { id: 'pinned',  label: 'Pinned',  Icon: Pin },
];

export function DetailsPanel({
  channelId,
  onClose,
}: {
  channelId: number;
  onClose: () => void;
}) {
  const { data: channelData } = useChannel(channelId);
  const { data: memberData } = useChannelMembers(channelId);
  const serverId = channelData?.channel?.serverId ?? null;
  const { data: serverData } = useServer(serverId);
  const serverPerms = useDiscussionPermissions(serverData?.myServerPermissions);
  const removeMemberMut = useRemoveServerMember(serverId ?? 0);
  const { data: presenceData } = useServerPresence(serverId);
  const { messages } = useChannelMessages(channelId);

  const [tab, setTab] = useState<Tab>('members');
  const [memberSearch, setMemberSearch] = useState('');
  const [attachmentSearch, setAttachmentSearch] = useState('');

  const channel = channelData?.channel ?? null;
  const members = useMemo(() => memberData?.results ?? [], [memberData]);

  const handleRemoveMember = async (userId: number, name: string) => {
    if (
      !(await confirmAction(
        `Remove ${name}?`,
        "They'll lose access until re-invited. Their messages will stay in the channel.",
        'Remove member',
        { danger: true, icon: 'warning' }
      ))
    ) {
      return;
    }
    removeMemberMut.mutate(userId);
  };

  const presenceByUser = useMemo(() => {
    const map = new Map<number, PresenceState>();
    for (const row of presenceData?.results ?? []) {
      map.set(Number(row.userId), row.presence);
    }
    return map;
  }, [presenceData]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const haystack = [m.user?.full_name, m.user?.email, m.user?.role]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [members, memberSearch]);

  const attachments = useMemo<AggregatedAttachment[]>(() => {
    const out: AggregatedAttachment[] = [];
    for (const m of messages) {
      if (m.deletedAt) continue;
      for (const a of m.attachments ?? []) {
        out.push({
          attachment: a,
          messageId: m.id,
          senderName: m.isAnonymous ? 'Anonymous' : (m.sender?.full_name ?? 'Unknown'),
          createdAt: m.createdAt,
        });
      }
    }
    return out.toReversed();
  }, [messages]);

  const filteredAttachments = useMemo(() => {
    const q = attachmentSearch.trim().toLowerCase();
    if (!q) return attachments;
    return attachments.filter((row) =>
      fileNameFromUrl(row.attachment.url).toLowerCase().includes(q)
    );
  }, [attachments, attachmentSearch]);

  return (
    <aside
      aria-label='Channel details'
      className='flex h-full w-[min(100%,20rem)] shrink-0 flex-col border-l border-border/70 bg-card/95 backdrop-blur-md'
    >
      <div className='flex h-14 shrink-0 items-center justify-between border-b border-border/70 px-4'>
        <div>
          <p className='font-display text-sm font-semibold leading-tight tracking-tight'>
            {channel?.name ?? 'Details'}
          </p>
          {channel?.topic && (
            <p className='max-w-[180px] truncate text-[11px] leading-tight text-muted-foreground'>
              {channel.topic}
            </p>
          )}
        </div>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='h-8 w-8 shrink-0'
          onClick={onClose}
          aria-label='Close details'
        >
          <X className='h-4 w-4' />
        </Button>
      </div>

      {/* Tab bar */}
      <div className='flex shrink-0 border-b px-1'>
        {TAB_CONFIG.map(({ id, label, Icon }) => (
          <button
            key={id}
            type='button'
            onClick={() => setTab(id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
              tab === id
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-current={tab === id ? 'true' : undefined}
          >
            <Icon className='h-3.5 w-3.5' />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <ScrollArea className='flex-1'>
        {tab === 'members' && (
          <div className='p-3'>
            {/* Member search */}
            <div className='relative mb-3'>
              <Search className='absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
              <Input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder='Search members…'
                className='h-8 rounded-full border-0 bg-muted/60 pl-8 text-xs focus-visible:ring-1'
              />
            </div>
            <DetailsAboutMembers
              topic={channel?.topic}
              members={members}
              filteredMembers={filteredMembers}
              memberSearch={memberSearch}
              onMemberSearchChange={setMemberSearch}
              presenceByUser={presenceByUser}
              canModerate={serverPerms.canModerateMembers || serverPerms.isAdmin}
              onRemoveMember={handleRemoveMember}
              attachments={attachments}
              filteredAttachments={filteredAttachments}
              attachmentSearch={attachmentSearch}
              onAttachmentSearchChange={setAttachmentSearch}
            />
          </div>
        )}

        {tab === 'files' && (
          <div className='p-3'>
            <div className='relative mb-3'>
              <Search className='absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
              <Input
                value={attachmentSearch}
                onChange={(e) => setAttachmentSearch(e.target.value)}
                placeholder='Search files…'
                className='h-8 rounded-full border-0 bg-muted/60 pl-8 text-xs focus-visible:ring-1'
              />
            </div>
            {filteredAttachments.length === 0 ? (
              <div className='flex flex-col items-center gap-2 py-10 text-center'>
                <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-muted'>
                  <Paperclip className='h-5 w-5 text-muted-foreground/50' />
                </div>
                <p className='text-xs text-muted-foreground'>
                  {attachmentSearch ? 'No matching files.' : 'No files shared yet.'}
                </p>
              </div>
            ) : (
              <div className='space-y-1'>
                {filteredAttachments.map((row, i) => (
                  <a
                    key={`${row.messageId}-${i}`}
                    href={row.attachment.accessUrl ?? row.attachment.url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center gap-2.5 rounded-lg px-2 py-2 text-xs hover:bg-muted transition-colors'
                  >
                    <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted'>
                      <Paperclip className='h-3.5 w-3.5 text-muted-foreground' />
                    </div>
                    <div className='min-w-0 flex-1'>
                      <p className='truncate font-medium text-foreground'>
                        {fileNameFromUrl(row.attachment.url)}
                      </p>
                      <p className='truncate text-[10px] text-muted-foreground'>{row.senderName}</p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'pinned' && (
          <div className='flex flex-col items-center gap-2 py-10 text-center px-4'>
            <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-muted'>
              <Pin className='h-5 w-5 text-muted-foreground/50' />
            </div>
            <p className='text-xs text-muted-foreground'>
              Pinned messages will appear here. Pin a message to highlight it for the whole channel.
            </p>
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}
