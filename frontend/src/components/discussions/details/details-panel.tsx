'use client';

import { X, Users, Paperclip, Pin } from 'lucide-react';
import { Button } from '@/features/ui/components/button';
import { ScrollArea } from '@/features/ui/components/scroll-area';
import { cn } from '@/lib/utils';
import { DetailsMembersTab } from './details-members-tab';
import { DetailsFilesTab } from './details-files-tab';
import { DetailsPinnedTab } from './details-pinned-tab';
import { useDetailsPanelData, type DetailsTab } from './use-details-panel-data';

const TAB_CONFIG: { id: DetailsTab; label: string; Icon: React.ElementType }[] = [
  { id: 'members', label: 'Members', Icon: Users },
  { id: 'files',   label: 'Files',   Icon: Paperclip },
  { id: 'pinned',  label: 'Pinned',  Icon: Pin },
];

export function DetailsPanel({
  channelId,
  onClose,
  onJumpToMessage,
}: {
  channelId: string;
  onClose: () => void;
  onJumpToMessage?: (messageId: string) => void;
}) {
  const {
    channel,
    tab,
    setTab,
    members,
    filteredMembers,
    memberSearch,
    setMemberSearch,
    attachments,
    filteredAttachments,
    attachmentSearch,
    setAttachmentSearch,
    presenceByUser,
    canModerate,
    handleRemoveMember,
  } = useDetailsPanelData(channelId);

  return (
    <aside
      aria-label='Channel details'
      className='flex h-full w-full min-w-0 shrink-0 flex-col border-l border-border/70 bg-card/95 backdrop-blur-md'
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
          <DetailsMembersTab
            topic={channel?.topic}
            members={members}
            filteredMembers={filteredMembers}
            memberSearch={memberSearch}
            onMemberSearchChange={setMemberSearch}
            presenceByUser={presenceByUser}
            canModerate={canModerate}
            onRemoveMember={handleRemoveMember}
            attachments={attachments}
            filteredAttachments={filteredAttachments}
            attachmentSearch={attachmentSearch}
            onAttachmentSearchChange={setAttachmentSearch}
          />
        )}

        {tab === 'files' && (
          <DetailsFilesTab
            attachments={filteredAttachments}
            attachmentSearch={attachmentSearch}
            onAttachmentSearchChange={setAttachmentSearch}
          />
        )}

        {tab === 'pinned' && (
          <DetailsPinnedTab
            channelId={channelId}
            onJumpToMessage={onJumpToMessage}
          />
        )}
      </ScrollArea>
    </aside>
  );
}
