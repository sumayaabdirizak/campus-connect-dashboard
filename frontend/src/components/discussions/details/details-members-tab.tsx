'use client';

import { Search } from 'lucide-react';
import { Input } from '@/features/ui/components/input';
import { DetailsAboutMembers } from './details-about-members';
import type { ChannelMember, PresenceState } from '@/lib/discussions/queries/types';
import type { AggregatedAttachment } from './attachment-row';

export function DetailsMembersTab({
  topic,
  members,
  filteredMembers,
  memberSearch,
  onMemberSearchChange,
  presenceByUser,
  canModerate,
  onRemoveMember,
  attachments,
  filteredAttachments,
  attachmentSearch,
  onAttachmentSearchChange,
}: {
  topic?: string | null;
  members: ChannelMember[];
  filteredMembers: ChannelMember[];
  memberSearch: string;
  onMemberSearchChange: (value: string) => void;
  presenceByUser: Map<number, PresenceState>;
  canModerate: boolean;
  onRemoveMember: (userId: number, name: string) => void;
  attachments: AggregatedAttachment[];
  filteredAttachments: AggregatedAttachment[];
  attachmentSearch: string;
  onAttachmentSearchChange: (value: string) => void;
}) {
  return (
    <div className='p-3'>
      <div className='relative mb-3'>
        <Search className='absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
        <Input
          value={memberSearch}
          onChange={(e) => onMemberSearchChange(e.target.value)}
          placeholder='Search members…'
          className='h-8 rounded-full border-0 bg-muted/60 pl-8 text-xs focus-visible:ring-1'
        />
      </div>
      <DetailsAboutMembers
        topic={topic}
        members={members}
        filteredMembers={filteredMembers}
        memberSearch={memberSearch}
        onMemberSearchChange={onMemberSearchChange}
        presenceByUser={presenceByUser}
        canModerate={canModerate}
        onRemoveMember={onRemoveMember}
        attachments={attachments}
        filteredAttachments={filteredAttachments}
        attachmentSearch={attachmentSearch}
        onAttachmentSearchChange={onAttachmentSearchChange}
      />
    </div>
  );
}
