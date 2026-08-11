import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/features/ui/components/accordion'
import { Input } from '@/features/ui/components/input'
import { Icons } from '@/components/icons'
import type { ChannelMember, PresenceState } from '@/lib/discussions/queries/types'
import { MemberRow } from './member-row'
import { AttachmentRow, type AggregatedAttachment } from './attachment-row'

type Props = {
  topic?: string | null
  members: ChannelMember[]
  filteredMembers: ChannelMember[]
  memberSearch: string
  onMemberSearchChange: (value: string) => void
  presenceByUser: Map<number, PresenceState>
  canModerate: boolean
  onRemoveMember: (userId: number, name: string) => void
  attachments: AggregatedAttachment[]
  filteredAttachments: AggregatedAttachment[]
  attachmentSearch: string
  onAttachmentSearchChange: (value: string) => void
}

export function DetailsAboutMembers({
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
}: Props) {
  return (
    <Accordion type='multiple' defaultValue={['about']} className='px-3'>
      <AccordionItem value='about' className='border-b-0'>
        <AccordionTrigger className='py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground hover:no-underline'>
          About
        </AccordionTrigger>
        <AccordionContent>
          {topic ? (
            <p className='text-xs font-medium uppercase leading-relaxed tracking-wide text-foreground'>
              {topic}
            </p>
          ) : (
            <p className='text-xs italic text-muted-foreground'>No topic set for this channel.</p>
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
              onChange={(e) => onMemberSearchChange(e.target.value)}
              placeholder='Search members'
              className='h-8 pl-7 text-xs'
            />
          </div>
          <div
            className='max-h-[min(50vh,22rem)] overflow-y-auto overscroll-y-contain pr-0.5 [-webkit-overflow-scrolling:touch]'
            role='region'
            aria-label='Channel members list'
          >
            {filteredMembers.length === 0 ? (
              <p className='py-2 text-center text-xs text-muted-foreground'>No members found</p>
            ) : (
              filteredMembers.map((m) => (
                <MemberRow
                  key={m.userId}
                  member={m}
                  presence={presenceByUser.get(Number(m.userId))}
                  canModerate={canModerate}
                  onRemove={onRemoveMember}
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
              onChange={(e) => onAttachmentSearchChange(e.target.value)}
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
  )
}
