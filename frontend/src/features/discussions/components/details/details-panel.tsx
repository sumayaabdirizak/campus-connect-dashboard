'use client';

import { useMemo, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  useChannel,
  useChannelMembers,
  useRemoveServerMember,
  useServer,
  useServerPresence
} from '../../api/queries';
import { useChannelMessages } from '../../hooks/use-channel-messages';
import { useDiscussionPermissions } from '../../hooks/use-discussion-permissions';
import type {
  ChannelMember,
  MessageAttachment,
  PresenceState
} from '../../api/types';
import { PresenceDot } from './presence-dot';

function initialsFor(name: string | null | undefined): string {
  const source = name?.trim() ?? '';
  if (!source) return '?';
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function formatSize(n?: number | null): string {
  if (n == null || !Number.isFinite(n) || n < 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fileNameFromUrl(url?: string): string {
  if (!url) return 'file';
  try {
    const u = new URL(url, 'http://local');
    const seg = u.pathname.split('/').pop() || 'file';
    return decodeURIComponent(seg);
  } catch {
    return 'file';
  }
}

function MemberRow({
  member,
  presence,
  canModerate,
  onRemove
}: {
  member: ChannelMember;
  presence?: PresenceState;
  canModerate: boolean;
  onRemove?: (userId: number, name: string) => void;
}) {
  const name = member.user?.full_name ?? `Member ${member.userId}`;
  const role = member.user?.role;
  const isInstructor = role === 'lecturer' || role === 'dean' || role === 'admin';
  return (
    <div className='group/member flex items-center gap-2 px-1 py-1.5'>
      <div className='relative'>
        <Avatar className='h-7 w-7'>
          <AvatarFallback className='text-[10px]'>
            {initialsFor(name)}
          </AvatarFallback>
        </Avatar>
        {presence && <PresenceDot state={presence} />}
      </div>
      <div className='min-w-0 flex-1'>
        <div className='truncate text-xs font-medium'>{name}</div>
        {role && (
          <div className='truncate text-[10px] capitalize text-muted-foreground'>
            {String(role).replace(/_/g, ' ')}
          </div>
        )}
      </div>
      {isInstructor && (
        <span className='rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary'>
          {role === 'dean' ? 'Dean' : role === 'admin' ? 'Admin' : 'Instr.'}
        </span>
      )}
      {canModerate && onRemove && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='h-6 w-6 opacity-0 transition-opacity group-hover/member:opacity-100 focus:opacity-100'
              aria-label={`Moderate ${name}`}
            >
              <Icons.ellipsis className='h-3.5 w-3.5' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-44'>
            <DropdownMenuItem
              className='gap-2 text-destructive focus:text-destructive'
              onSelect={() => onRemove(Number(member.userId), name)}
            >
              <Icons.trash className='h-3.5 w-3.5' />
              Remove from server
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

type AggregatedAttachment = {
  attachment: MessageAttachment;
  messageId: number;
  senderName: string;
  createdAt: string;
};

function AttachmentRow({ row }: { row: AggregatedAttachment }) {
  const { attachment } = row;
  const href = attachment.accessUrl ?? attachment.url;
  const name = fileNameFromUrl(attachment.url);
  return (
    <a
      href={href ?? '#'}
      target='_blank'
      rel='noreferrer'
      onClick={(e) => {
        if (!href) e.preventDefault();
      }}
      className='flex items-center gap-2 rounded-md px-1 py-1.5 transition-colors hover:bg-muted'
    >
      <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted text-[9px] font-bold text-muted-foreground ring-1 ring-border'>
        {String(attachment.fileType).slice(0, 3).toUpperCase()}
      </span>
      <div className='min-w-0 flex-1'>
        <div className='truncate text-xs font-medium'>{name}</div>
        <div className='text-[10px] text-muted-foreground'>
          {formatSize(attachment.size)} · from {row.senderName}
        </div>
      </div>
    </a>
  );
}

export function DetailsPanel({
  channelId,
  onClose
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

  const handleRemoveMember = (userId: number, name: string) => {
    if (
      !window.confirm(
        `Remove ${name} from the server? They'll lose access until re-invited. Their messages stay.`
      )
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
  const { messages } = useChannelMessages(channelId);

  const [tab, setTab] = useState<'details' | 'activity'>('details');
  const [memberSearch, setMemberSearch] = useState('');
  const [attachmentSearch, setAttachmentSearch] = useState('');

  const channel = channelData?.channel ?? null;
  const members = useMemo(() => memberData?.results ?? [], [memberData]);

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
          senderName: m.isAnonymous ? 'Anonymous' : m.sender?.full_name ?? 'Unknown',
          createdAt: m.createdAt
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
      className='flex h-full w-[320px] shrink-0 flex-col border-l bg-background'
    >
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as 'details' | 'activity')}
        className='flex flex-1 flex-col overflow-hidden'
      >
        <header className='flex shrink-0 items-center border-b border-foreground/15 pr-1'>
          <TabsList className='h-12 flex-1 justify-start gap-0 rounded-none border-0 bg-transparent p-0'>
            <TabsTrigger
              value='details'
              className={cn(
                'h-12 flex-1 rounded-none border-0 border-b-2 border-transparent bg-transparent text-sm font-medium shadow-none',
                'text-muted-foreground data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none'
              )}
            >
              Details
            </TabsTrigger>
            <TabsTrigger
              value='activity'
              className={cn(
                'h-12 flex-1 rounded-none border-0 border-b-2 border-transparent bg-transparent text-sm font-medium shadow-none',
                'text-muted-foreground data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none'
              )}
            >
              Activity
            </TabsTrigger>
          </TabsList>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='ml-1 h-9 w-9 shrink-0'
            onClick={onClose}
            aria-label='Close details'
          >
            <Icons.close className='h-4 w-4' />
          </Button>
        </header>

        <TabsContent value='details' className='m-0 flex flex-1 flex-col overflow-hidden'>
            <ScrollArea className='flex-1'>
              <Accordion
                type='multiple'
                defaultValue={['about']}
                className='px-3'
              >
                <AccordionItem value='about' className='border-b-0'>
                  <AccordionTrigger className='py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground hover:no-underline'>
                    About
                  </AccordionTrigger>
                  <AccordionContent>
                    {channel?.topic ? (
                      <p className='text-xs font-medium uppercase leading-relaxed tracking-wide text-foreground'>
                        {channel.topic}
                      </p>
                    ) : (
                      <p className='text-xs italic text-muted-foreground'>
                        No topic set for this channel.
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value='members' className='border-b-0'>
                  <AccordionTrigger className='py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground hover:no-underline'>
                    <span className='flex items-center gap-2'>
                      Members
                      <span className='rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-muted-foreground'>
                        {members.length}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className='pb-3'>
                    <div className='relative mb-2'>
                      <Icons.search className='absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
                      <Input
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder='Search members'
                        className='h-8 pl-7 text-xs'
                      />
                    </div>
                    {/* Scroll when Members is open — long lists stay inside the panel */}
                    <div
                      className='max-h-[min(50vh,22rem)] overflow-y-auto overscroll-y-contain pr-0.5 [-webkit-overflow-scrolling:touch]'
                      role='region'
                      aria-label='Channel members list'
                    >
                      {filteredMembers.length === 0 ? (
                        <p className='py-2 text-center text-xs text-muted-foreground'>
                          No members found
                        </p>
                      ) : (
                        filteredMembers.map((m) => (
                          <MemberRow
                            key={m.userId}
                            member={m}
                            presence={presenceByUser.get(Number(m.userId))}
                            canModerate={
                              serverPerms.canModerateMembers || serverPerms.isAdmin
                            }
                            onRemove={handleRemoveMember}
                          />
                        ))
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value='attachments' className='border-b-0'>
                  <AccordionTrigger className='py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground hover:no-underline'>
                    <span className='flex items-center gap-2'>
                      Attachments
                      <span className='rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-muted-foreground'>
                        {attachments.length}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className='pb-3'>
                    <div className='relative mb-2'>
                      <Icons.search className='absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
                      <Input
                        value={attachmentSearch}
                        onChange={(e) => setAttachmentSearch(e.target.value)}
                        placeholder='Search files'
                        className='h-8 pl-7 text-xs'
                      />
                    </div>
                    <div className='max-h-[min(40vh,16rem)] overflow-y-auto overscroll-y-contain pr-0.5 [-webkit-overflow-scrolling:touch]'>
                      {filteredAttachments.length === 0 ? (
                        <p className='py-2 text-center text-xs text-muted-foreground'>
                          {attachments.length === 0
                            ? 'No attachments in this channel yet'
                            : 'No matches'}
                        </p>
                      ) : (
                        filteredAttachments.map((row, i) => (
                          <AttachmentRow
                            key={`${row.messageId}-${row.attachment.id}-${i}`}
                            row={row}
                          />
                        ))
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </ScrollArea>
          </TabsContent>

        <TabsContent value='activity' className='m-0 flex flex-1 flex-col overflow-hidden'>
          <div className='flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground'>
            <Icons.clock className='h-6 w-6 opacity-60' />
            <p className='text-xs'>Activity feed lands in a future phase.</p>
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
